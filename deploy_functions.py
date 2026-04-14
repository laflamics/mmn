#!/usr/bin/env python3
"""
Supabase Edge Functions Deployment Script
Deploys functions using Supabase API
"""

import os
import sys
import requests
import json
from pathlib import Path

# Configuration
TOKEN = "sbp_aef921f9ba75b367ba28bf2a669ab6111a75c32d"
API_URL = "https://api.supabase.com/v1"

def get_project_id():
    """Extract project ID from .env file"""
    env_file = Path(".env")
    if not env_file.exists():
        print("Error: .env file not found")
        return None
    
    with open(env_file) as f:
        for line in f:
            if line.startswith("VITE_SUPABASE_URL"):
                url = line.split("=")[1].strip()
                # Extract project ID from URL like https://xxxxx.supabase.co
                project_id = url.split("//")[1].split(".")[0]
                return project_id
    
    return None

def read_function_code(function_name):
    """Read function code from file"""
    path = Path(f"supabase/functions/{function_name}/index.ts")
    if not path.exists():
        print(f"Error: Function file not found: {path}")
        return None
    
    with open(path) as f:
        return f.read()

def deploy_function(project_id, function_name, code):
    """Deploy a function to Supabase"""
    url = f"{API_URL}/projects/{project_id}/functions/{function_name}/deploy"
    
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "slug": function_name,
        "name": function_name,
        "body": code
    }
    
    print(f"Deploying {function_name}...")
    
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"✓ {function_name} deployed successfully")
            return True
        else:
            print(f"✗ Failed to deploy {function_name}")
            print(f"  Status: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error deploying {function_name}: {e}")
        return False

def main():
    """Main deployment function"""
    print("Supabase Edge Functions Deployment")
    print("=" * 40)
    
    # Get project ID
    project_id = get_project_id()
    if not project_id:
        print("Error: Could not determine project ID from .env")
        sys.exit(1)
    
    print(f"Project ID: {project_id}")
    print()
    
    # Deploy functions
    functions = ["remind-purchasing", "process-order"]
    results = []
    
    for func_name in functions:
        code = read_function_code(func_name)
        if code:
            success = deploy_function(project_id, func_name, code)
            results.append((func_name, success))
        else:
            results.append((func_name, False))
    
    # Summary
    print()
    print("=" * 40)
    print("Deployment Summary:")
    for func_name, success in results:
        status = "✓ Success" if success else "✗ Failed"
        print(f"  {func_name}: {status}")
    
    # Print function URLs
    print()
    print("Function URLs:")
    for func_name, success in results:
        if success:
            url = f"https://{project_id}.supabase.co/functions/v1/{func_name}"
            print(f"  - {url}")
    
    # Exit code
    all_success = all(success for _, success in results)
    sys.exit(0 if all_success else 1)

if __name__ == "__main__":
    main()
