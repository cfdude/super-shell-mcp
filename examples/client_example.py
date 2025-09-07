import asyncio
import json

from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession


async def main():
    # Start the server as a child process via stdio
    params = StdioServerParameters(command="python", args=["-m", "your_pkg"])

    async with stdio_client(params) as (read, write):
        session = ClientSession()

        # Initialize session (handshake)
        await session.initialize(read, write)

        # --- List available tools ---
        tools = await session.list_tools()
        print("Available tools:")
        for t in tools:
            print(f"- {t.name}: {t.description}")

        # --- Get the whitelist ---
        print("\nWhitelisted commands:")
        wl_res = await session.call_tool("get_whitelist", {})
        print(wl_res.content[0].text)

        # --- Execute a safe command ---
        print("\nExecuting a safe command (echo 'hello from client'):")
        safe_res = await session.call_tool(
            "execute_command",
            {"command": "echo", "args": ["hello from client"]},
        )
        for block in safe_res.content:
            if getattr(block, "text", ""):
                print(block.text)

        # --- Add a command and require approval (mkdir) ---
        print("\nMarking 'mkdir' as requires_approval and trying it:")
        await session.call_tool(
            "add_to_whitelist",
            {"command": "mkdir", "securityLevel": "requires_approval", "description": "Create dirs"},
        )
        try:
            mk_res = await session.call_tool(
                "execute_command",
                {"command": "mkdir", "args": ["test-dir"]},
            )
            # If the server returned text directly (unlikely in approval path), print it
            for block in mk_res.content:
                if getattr(block, "text", ""):
                    print(block.text)
        except Exception as e:
            print(f"(Expected) Command requires approval: {e}")

        # --- Get pending commands and approve the first one ---
        print("\nGetting pending commands:")
        pend = await session.call_tool("get_pending_commands", {})
        pend_list = json.loads(pend.content[0].text)
        print(json.dumps(pend_list, indent=2))

        if pend_list:
            cmd_id = pend_list[0]["id"]
            print(f"Approving command with ID: {cmd_id}")
            approve_res = await session.call_tool("approve_command", {"commandId": cmd_id})
            for block in approve_res.content:
                if getattr(block, "text", ""):
                    print(block.text)

        # --- Try a forbidden command (rm) to show failure path ---
        print("\nTrying a forbidden command (rm -rf test-dir):")
        try:
            rm_res = await session.call_tool(
                "execute_command",
                {"command": "rm", "args": ["-rf", "test-dir"]},
            )
            for block in rm_res.content:
                if getattr(block, "text", ""):
                    print(block.text)
        except Exception as e:
            print(f"(Expected) Forbidden or error: {e}")

        # Graceful shutdown
        await session.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
