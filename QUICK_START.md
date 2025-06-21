# Quick Start Guide

This guide provides the simplest instructions to get the Noise Protocol Secure Chat application up and running quickly.

## Quick Installation

### Option 1: Using the automatic installer (Recommended)

1. Run the installation script:

   ```bash
   python install.py
   ```

2. Follow the prompts to complete the installation.

### Option 2: Manual installation

1. Create a virtual environment (recommended):

   ```bash
   # Create virtual environment
   python -m venv venv

   # Activate it on Windows
   venv\Scripts\activate
   
   # OR activate it on macOS/Linux
   source venv/bin/activate
   ```

2. Install requirements:

   ```bash
   pip install -r requirements.txt
   pip install -e .
   ```

## Running the Application

### Step 1: Start the Chat Server

Open a terminal window and run:

```bash
cd noiseprotocol/Implementation
python noise_chat_server.py
```

The server will start on port 8000.

### Step 2: Start the Web Interface

Open another terminal window and run:

```bash
cd web_ui
python app.py
```

The web interface will start on port 5001.

### Step 3: Access the Web Interface

Open your web browser and go to:

```
http://localhost:5001
```

Enter a username, use "localhost" as the server, and port 8000, then click "Connect".

## Command-Line Interface (Optional)

If you prefer using the command-line interface instead of the web interface:

```bash
cd noiseprotocol/Implementation
python noise_chat_client.py --username YourName
```

## Common Issues

1. **Connection Failed**: Make sure the server is running and accessible
2. **Import Errors**: Verify you activated the virtual environment and installed all requirements
3. **Port Already in Use**: Try changing the port with the `--port` flag

For detailed information and troubleshooting, please refer to the full [README.md](README.md).