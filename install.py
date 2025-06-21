#!/usr/bin/env python3
"""
Installation script for Noise Protocol Secure Chat Application
This script simplifies the installation process for first-time users.
"""

import os
import sys
import subprocess
import platform
import shutil

def print_header(message):
    """Print a formatted header message."""
    print("\n" + "=" * 80)
    print(f" {message}")
    print("=" * 80)

def run_command(command, description=None):
    """Run a shell command and print its output."""
    if description:
        print(f"\n> {description}")
    
    print(f"$ {' '.join(command)}")
    try:
        result = subprocess.run(command, check=True, text=True, capture_output=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False

def check_python_version():
    """Check if Python version is compatible."""
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 7):
        print("Error: This application requires Python 3.7 or higher.")
        print(f"Current Python version: {platform.python_version()}")
        return False
    return True

def create_virtual_environment():
    """Create and activate a virtual environment."""
    print_header("Setting up virtual environment")
    
    # Check if venv exists
    if os.path.exists("venv"):
        print("Virtual environment already exists.")
        choice = input("Do you want to recreate it? (y/n): ").lower()
        if choice == 'y':
            shutil.rmtree("venv")
        else:
            return True
    
    # Create venv
    if not run_command([sys.executable, "-m", "venv", "venv"], 
                       "Creating virtual environment"):
        return False
    
    print("\nVirtual environment created successfully!")
    
    # Activation instructions
    if platform.system() == "Windows":
        print("\nTo activate the virtual environment:")
        print("  venv\\Scripts\\activate")
    else:
        print("\nTo activate the virtual environment:")
        print("  source venv/bin/activate")
    
    return True

def check_pip():
    """Check if pip is available."""
    return run_command([sys.executable, "-m", "pip", "--version"], 
                      "Checking pip version")

def install_requirements():
    """Install required packages."""
    print_header("Installing required packages")
    
    # Install requirements
    if not run_command([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      "Installing general requirements"):
        return False
    
    # Install noiseprotocol in development mode
    if not run_command([sys.executable, "-m", "pip", "install", "-e", "."], 
                      "Installing noiseprotocol package in development mode"):
        print("Warning: Could not install noiseprotocol package in development mode.")
        
    print("\nAll requirements installed successfully!")
    return True

def print_next_steps():
    """Print next steps for the user."""
    print_header("Installation Complete!")
    print("""
Next steps:

1. Activate the virtual environment:
   
   # On Windows
   venv\\Scripts\\activate
   
   # On macOS/Linux
   source venv/bin/activate

2. Start the chat server:
   
   cd noiseprotocol/Implementation
   python noise_chat_server.py

3. Start the web interface (in a new terminal window, with virtual env activated):
   
   cd web_ui
   python app.py

4. Open your browser and navigate to:
   
   http://localhost:5001

For more information, refer to the README.md file.
""")

def main():
    """Main installation function."""
    print_header("Noise Protocol Secure Chat Application Installer")
    
    # Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Check pip
    if not check_pip():
        print("Error: pip is not available. Please install pip and try again.")
        sys.exit(1)
    
    # Create virtual environment
    if not create_virtual_environment():
        print("Error: Failed to create virtual environment.")
        sys.exit(1)
    
    # Install requirements
    choice = input("\nDo you want to install requirements now? (y/n): ").lower()
    if choice == 'y':
        if not install_requirements():
            print("Error: Failed to install requirements.")
            sys.exit(1)
        print_next_steps()
    else:
        print("\nSkipping requirement installation.")
        print("\nTo complete installation later, run:")
        print("  1. Activate the virtual environment")
        print("  2. Run: pip install -r requirements.txt")
        print("  3. Run: pip install -e .")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())