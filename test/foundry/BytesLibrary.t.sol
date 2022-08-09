// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.12;

import "../../contracts/libraries/BytesLibrary.sol";

contract TestBytesLibrary {
  using BytesLibrary for bytes;

  function testStartsWithPrefix() public pure {
    bytes memory value = "test1234";

    assert(value.startsWith("test"));

    assert(!value.startsWith(" tes"));
    assert(!value.startsWith("1234"));

    // Checks if starts with bytes4
    assert(!value.startsWith(""));
    assert(!value.startsWith("t"));
  }

  function testStartsWithFullString() public pure {
    bytes memory value = "test";

    assert(value.startsWith("test"));

    assert(!value.startsWith(" tes"));
    assert(!value.startsWith("1234"));

    // Checks if starts with bytes4
    assert(!value.startsWith(""));
    assert(!value.startsWith("t"));
  }

  function testStartsWithTooShort() public pure {
    bytes memory value = "tes";

    assert(!value.startsWith("tes"));
    assert(!value.startsWith(" tes"));
    assert(!value.startsWith(""));
    assert(!value.startsWith("t"));
  }
}
