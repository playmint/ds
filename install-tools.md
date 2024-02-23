# Installing tools for Downstream

These tools are required for building Downstream from source using `make`.

A quicker way of running Downstream is to use Docker - see the main [readme](./readme.md') for details.

## Tools list

Tools required to build Downstream:
- Unity Editor 2021.3.13f1
    - Unity WebGL submodule

(**_🖥 Windows_** The following should all be installed to WSL:)
- make
- gcc
- node (use nvm to match correct version)
- go (version go1.19.13 - similar versions may be fine)
- forge (version 0.2.0)
- ethereum tools (including solc and abigen)

## Installation Instructions

### OS specific instructions
- **🖥 Windows** users will need to instal Windows Subsystem for Linux (**__WSL__**) and carefully follow the instructions as to which tools need to be installed to native Windows vs inside WSL.
- **🍏 MacOS** supports all the tools natively.



### 1. Unity
- Install [Unity Hub](https://unity.com/download)
- Install Unity Editor version 2021.3.13f1 via [Unity LTS archive](https://unity.com/releases/editor/qa/lts-releases?version=2021.3)
	- **🖥 Windows only** Use `"C:\Program Files\Unity\Hub\Editor\2021.3.13f1"` as your install path **(be sure to change the default path and folder name)**
- Install WebGL submodule

### 2. WSL (Windows Subsystem for Linux)
**_🖥 Windows only_**
- **Install WSL:** Follow the guide at [Microsoft WSL Install](https://learn.microsoft.com/en-us/windows/wsl/install). Note that enabling virtualization might vary based on your CPU model.
- **Initial Setup in PowerShell:**
  - Run `wsl --install`.
  - Restart your PC.
  - Upon reboot, follow the on-screen instructions to complete Ubuntu setup.
  - Create a username and password as per [Microsoft's best practices](https://learn.microsoft.com/en-us/windows/wsl/setup/environment).
- **Switch to WSL1:** The default WSL2 can be changed to WSL1, which works better for our purposes.
  - In PowerShell, run `wsl --list --verbose` to find your Ubuntu distribution name.
  - Switch to WSL1 with `wsl --set-version [distribution name] 1`. Example: `wsl --set-version Ubuntu 1`.

- **Installing WSL essentials**
- **Access WSL:** Use `wsl` command in PowerShell or open the Ubuntu application.
- **Install gcc & make:** 
  ```
  sudo apt update
  sudo apt install build-essential
  ```

> ⚠️ All remaining tools should be installed to WSL if running on Windows

### 3. Node
  - Recommended to use nvm ([nvm install script](https://github.com/nvm-sh/nvm#install--update-script)).
  - Run the following commands:
    ```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    ```
    Navigate to the `ds` directory and run `nvm install`.

**_🖥 Windows:_** 
 - Note ds path with be under /mnt/; e.g. `$cd /mnt/d/playmint/ds` 
 - Extra Node configuration under WSL may be necessary:
   - Set environment variable:
     ```
     NODE_OPTIONS=--max-old-space-size=4096
     ```
   - Restart your machine.
   - Update Node packages:
     ```
     npm update -g
     ```
   - Update Node packages:
    ```
    npm cache clean -f
    ```

### 4. Go
  - Download **go1.19.13.linux-amd64.tar.gz** from [Go Downloads](https://go.dev/dl/).
  - Follow installation instructions at [Go Install Guide](https://go.dev/doc/install); 
  - **_⚠️ 🖥 Windows_** use the Linux download and install instructions to setup in WSL.

### 5. Ethereum Tools
**_🖥 Windows_**
  ```
  sudo add-apt-repository ppa:ethereum/ethereum
  sudo apt-get update
  sudo apt-get install solc
  sudo apt-get install abigen
  ```
**_🍏 MacOS_**
  ```
  brew tap ethereum/ethereum
  brew install ethereum
  ```

### 6. Foundry (forge and anvil)
Follow instructions at [Foundry Installation](https://book.getfoundry.sh/getting-started/installation):
  ```
  curl -L https://foundry.paradigm.xyz | bash
  foundryup
  ```
</details>
