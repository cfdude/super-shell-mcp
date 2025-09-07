import asyncio
import sys
import os
import pytest

from src.services.command_service import (
    CommandService,
    CommandSecurityLevel,
    CommandWhitelistEntry,
)

@pytest.mark.asyncio
async def test_safe_command_echo_runs_immediately():
    svc = CommandService()
    # Ensure 'echo' is SAFE (platform utils already adds it, but enforce explicitly)
    svc.add_to_whitelist(
        CommandWhitelistEntry(command="echo", security_level=CommandSecurityLevel.SAFE)
    )

    result = await svc.execute_command("echo", ["hello"])
    assert "hello" in result.stdout
    assert result.stderr == ""


@pytest.mark.asyncio
async def test_not_whitelisted_command_fails():
    svc = CommandService()
    # Purposely don't add 'definitely_not_a_command' to whitelist
    with pytest.raises(RuntimeError) as ei:
        await svc.execute_command("definitely_not_a_command", [])
    assert "not whitelisted" in str(ei.value)


@pytest.mark.asyncio
async def test_forbidden_command_rejected():
    svc = CommandService()
    svc.add_to_whitelist(
        CommandWhitelistEntry(command="echo", security_level=CommandSecurityLevel.FORBIDDEN)
    )
    with pytest.raises(RuntimeError) as ei:
        await svc.execute_command("echo", ["blocked"])
    assert "forbidden" in str(ei.value)


@pytest.mark.asyncio
async def test_requires_approval_flow_approve_success(monkeypatch):
    svc = CommandService()
    # Mark 'echo' as REQUIRES_APPROVAL to exercise the queue + approve path
    svc.add_to_whitelist(
        CommandWhitelistEntry(command="echo", security_level=CommandSecurityLevel.REQUIRES_APPROVAL)
    )

    # Start execution → should enqueue and return only after approval
    pending_future = asyncio.create_task(
        svc.execute_command("echo", ["approved run"], requested_by="tester")
    )

    # Wait until a pending command is visible
    for _ in range(50):
        pending = svc.get_pending_commands()
        if pending:
            break
        await asyncio.sleep(0.05)

    assert pending, "No pending command appeared"
    cmd_id = pending[0].id

    # Approve it -> the original future should resolve
    result = await svc.approve_command(cmd_id)
    assert "approved run" in result.stdout

    # Also the original waiting future should complete with same result
    got = await pending_future
    assert got.stdout == result.stdout


@pytest.mark.asyncio
async def test_requires_approval_flow_denied():
    svc = CommandService()
    svc.add_to_whitelist(
        CommandWhitelistEntry(command="echo", security_level=CommandSecurityLevel.REQUIRES_APPROVAL)
    )

    pending_task = asyncio.create_task(svc.execute_command("echo", ["nope"]))

    # Wait until pending exists
    for _ in range(50):
        pending = svc.get_pending_commands()
        if pending:
            break
        await asyncio.sleep(0.05)

    assert pending
    cmd_id = pending[0].id

    # Deny it → the waiting task should error out
    svc.deny_command(cmd_id, reason="policy")
    with pytest.raises(Exception) as ei:
        await pending_task
    assert "policy" in str(ei.value)


@pytest.mark.asyncio
async def test_queue_non_blocking_timeout_event_emits():
    svc = CommandService()
    events = {"timeout": False}

    def on_timeout(data):
        if data.get("commandId"):
            events["timeout"] = True

    svc.on("command:approval_timeout", on_timeout)

    svc.add_to_whitelist(
        CommandWhitelistEntry(command="echo", security_level=CommandSecurityLevel.REQUIRES_APPROVAL)
    )
    cmd_id = svc.queue_command_for_approval_non_blocking("echo", ["hi"])

    # Wait a bit over 5s to allow the scheduled timeout callback to fire
    # (use a shorter sleep if you change the service delay)
    await asyncio.sleep(5.5)
    assert events["timeout"] is True
    # Clean up
    if cmd_id in {c.id for c in svc.get_pending_commands()}:
        svc.deny_command(cmd_id)
