// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    mapping(uint => Candidate) public candidates;
    mapping(address => bool) public voters;

    uint public candidatesCount;
    address public owner;

    event votedEvent(uint indexed candidateId);
    event candidateAdded(uint indexed candidateId, string name);

    constructor() {
        owner = msg.sender;
        addCandidate("Rama");
        addCandidate("Nick");
        addCandidate("Jose");
    }

    function addCandidate(string memory _name) public {
        require(msg.sender == owner, "Only owner can add candidates");
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
        emit candidateAdded(candidatesCount, _name);
    }

    function vote(uint _candidateId) public {
        require(!voters[msg.sender], "Already voted.");
        require(
            _candidateId > 0 && _candidateId <= candidatesCount,
            "Invalid candidate"
        );

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;

        emit votedEvent(_candidateId);
    }
}
