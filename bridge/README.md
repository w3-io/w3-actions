# @w3-io/bridge

W3 syscall bridge SDK for Docker-based actions. Zero dependencies.

Chain operations (Ethereum, Bitcoin, Solana) and crypto primitives via the W3 bridge socket. The protocol handles signing, RPC routing, and access control — actions never touch private keys.

## Usage

```js
import { bridge } from '@w3-io/bridge'

// Read a contract
const { result } = await bridge.ethereum.readContract({
  network: 'base',
  contract: '0xd1b1afe415f0efb2d31c672d77cd5db810f5e02c',
  method: 'function balanceOf(address) returns (uint256)',
  args: ['0x51AaE7357c8baD10DB3532e9AC597efFA5C3820f'],
})

// Call a contract (write — requires bridge-allow)
await bridge.ethereum.callContract({
  network: 'avalanche',
  contract: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
  method: 'depositForBurn(uint256,uint32,bytes32,address)',
  args: [amount, destDomain, recipient, usdc],
})

// Crypto
const { hash } = await bridge.crypto.keccak256({ data: '0xdeadbeef' })

// Solana
await bridge.solana.callProgram({
  network: 'solana',
  programId: 'CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC',
  accounts: [...],
  data: '0x...',
})

// Heartbeat for long operations
const stop = bridge.startHeartbeat()
// ... long operation ...
stop()
```

## Workflow YAML

Actions using the bridge must declare which operations they need:

```yaml
- name: "Transfer USDC"
  uses: w3-io/w3-circle-action@v1
  bridge-allow:
    - ethereum/read
    - ethereum/call-contract
    - crypto/keccak256
  with:
    command: burn
    chain: avalanche
    destination-chain: base
    amount: "100"
```

## Environment

The SDK reads these environment variables (set automatically by the W3 runtime):

| Variable | Description |
|----------|-------------|
| `W3_BRIDGE_SOCKET` | Unix socket path (production) |
| `W3_BRIDGE_URL` | TCP URL fallback (macOS dev) |

## API

### Chain operations

**Ethereum**: `readContract`, `callContract`, `getBalance`, `getTokenBalance`, `getTokenAllowance`, `transfer`, `transferToken`, `approveToken`, `sendTransaction`, `deployContract`, `getTransaction`, `getEvents`, `resolveName`, `waitForTransaction`, `getNftOwner`, `transferNft`

**Bitcoin**: `getBalance`, `getUtxos`, `getTransaction`, `getFeeRate`, `send`, `waitForTransaction`

**Solana**: `getBalance`, `getTokenBalance`, `getAccount`, `getTokenAccounts`, `transfer`, `transferToken`, `callProgram`, `getTransaction`, `waitForTransaction`

### Crypto

`keccak256`, `aesEncrypt`, `aesDecrypt`, `ed25519Sign`, `ed25519Verify`, `ed25519PublicKey`, `hkdf`, `jwtSign`, `jwtVerify`, `totp`

### Lifecycle

`health()`, `heartbeat()`, `startHeartbeat(intervalMs)`
