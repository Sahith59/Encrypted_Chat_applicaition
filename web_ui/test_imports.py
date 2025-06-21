#!/usr/bin/env python3
"""
Test script to verify imports work correctly
"""
import os
import sys

# Print paths for debugging
print(f"Current working directory: {os.getcwd()}")

# Get the absolute path to relevant directories
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
implementation_path = os.path.join(parent_dir, 'noiseprotocol', 'Implementation')
print(f"Parent directory: {parent_dir}")
print(f"Implementation directory: {implementation_path}")

# Add both paths to Python's module search path
sys.path.insert(0, implementation_path)  # Add Implementation dir first
sys.path.insert(0, parent_dir)  # Then add parent dir

# Print Python's module search paths
print("\nPython module search paths:")
for path in sys.path:
    print(f"  - {path}")

# Try importing the modules
print("\nAttempting imports:")

try:
    print("Importing NoiseProtocolHandler...", end=" ")
    from noiseprotocol.Implementation.noise_protocol_handler import NoiseProtocolHandler
    print("SUCCESS")
except ImportError as e:
    print(f"FAILED: {e}")

try:
    print("Importing NoiseChatClient...", end=" ")
    from noiseprotocol.Implementation.noise_chat_client import NoiseChatClient
    print("SUCCESS")
except ImportError as e:
    print(f"FAILED: {e}")

# Check if files exist
print("\nChecking if files exist:")
noise_handler_path = os.path.join(implementation_path, 'noise_protocol_handler.py')
noise_client_path = os.path.join(implementation_path, 'noise_chat_client.py')

print(f"noise_protocol_handler.py: {os.path.exists(noise_handler_path)}")
print(f"noise_chat_client.py: {os.path.exists(noise_client_path)}")