// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Classroom demonstration: one wallet, one public vote. No identity verification.
contract CampusVote {
    address public immutable owner;
    bool public isOpen = true;
    uint256 public totalVotes;
    uint256[3] public votes;
    mapping(address => bool) public hasVoted;
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event ElectionStatusChanged(bool isOpen);

    constructor() { owner = msg.sender; }

    function vote(uint256 candidateId) external {
        require(isOpen, "Election is closed");
        require(candidateId < 3, "Invalid candidate");
        require(!hasVoted[msg.sender], "Wallet already voted");
        hasVoted[msg.sender] = true;
        votes[candidateId]++;
        totalVotes++;
        emit VoteCast(msg.sender, candidateId);
    }

    function setElectionOpen(bool open) external {
        require(msg.sender == owner, "Only owner");
        isOpen = open;
        emit ElectionStatusChanged(open);
    }
}
