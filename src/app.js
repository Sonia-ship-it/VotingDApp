let contractABI;
let web3;
let votingContract;
let contractNetworks;

async function loadABI() {
  try {
    // Cache buster to prevent browser from loading stale ABI
    const response = await fetch('./contracts/Voting.json?v=' + new Date().getTime());
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    contractABI = data.abi;
    contractNetworks = data.networks;
    console.log("Successfully loaded dynamic ABI. Networks available:", Object.keys(contractNetworks));
  } catch (err) {
    console.error("Failed to load ABI:", err);
  }
}

async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      web3 = new Web3(window.ethereum);
      const accounts = await web3.eth.getAccounts();
      
      const accountElem = document.getElementById('account');
      const shortAccount = `${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
      accountElem.innerText = shortAccount;
      
      const statusDot = document.getElementById('statusDot');
      statusDot.classList.add('connected');
      
      const networkName = document.getElementById('networkName');
      networkName.innerText = 'Connected';
      
      const accountDisplay = document.getElementById('accountDisplay');
      accountDisplay.style.display = 'block';
      
      const connectBtn = document.getElementById('connectBtn');
      connectBtn.style.display = 'none';
      
      const statsSection = document.getElementById('statsSection');
      statsSection.style.display = 'grid';
      
      const addCandidateSection = document.getElementById('addCandidateSection');
      addCandidateSection.style.display = 'block';
      
      const loadingState = document.getElementById('loadingState');
      loadingState.style.display = 'none';

      if (!contractNetworks) {
        await loadABI();
      }
      
      if (!contractNetworks) {
          showToast('Contract networks not loaded. ABI might be missing.', 'error');
          return;
      }
      
      let networkId = await web3.eth.net.getId();
      networkId = networkId.toString();
      console.log("MetaMask connected to network ID:", networkId);
      console.log("Available networks:", Object.keys(contractNetworks));
      
      const deployedNetwork = contractNetworks[networkId];
      
      if (!deployedNetwork) {
          showToast(`Smart contract not deployed to detected network.\n\nMetaMask Network ID: ${networkId}\nAvailable Networks: ${Object.keys(contractNetworks).join(', ')}\n\nPlease switch MetaMask to your local Ganache network or deploy the contract to the current network.`, 'error');
          return;
      }
      
      console.log("Connecting to contract at address:", deployedNetwork.address);
      votingContract = new web3.eth.Contract(contractABI, deployedNetwork.address);
      
      try {
        await loadCandidates(votingContract, accounts[0]);
        showToast('Wallet connected successfully!', 'success');
      } catch (err) {
        console.error("Load candidates failed directly after init", err);
        showToast('Failed to load candidates', 'error');
      }
    } catch (err) {
      console.error("Failed to connect MetaMask:", err);
      showToast('Failed to connect MetaMask', 'error');
    }
  } else {
    showToast('MetaMask not detected! Please install MetaMask extension.', 'error');
  }
}

async function loadCandidates(contract, account) {
  try {
    const count = await contract.methods.candidatesCount().call();
    const list = document.getElementById("candidates");
    list.innerHTML = "";
    
    let totalVotes = 0;
    const hasVoted = await contract.methods.voters(account).call();
    
    for (let i = 1; i <= count; i++) {
      const candidate = await contract.methods.candidates(i).call();
      totalVotes += parseInt(candidate.voteCount);
      
      const li = document.createElement("li");
      li.className = "candidate-card";
      
      const name = document.createElement("div");
      name.className = "candidate-name";
      name.innerHTML = `<span>🎯</span> ${candidate.name}`;
      
      const votesDiv = document.createElement("div");
      votesDiv.className = "candidate-votes";
      votesDiv.innerHTML = `
        <span class="votes-label">Votes</span>
        <span class="votes-count">${candidate.voteCount}</span>
      `;
      
      const button = document.createElement("button");
      button.className = "vote-btn";
      button.innerText = hasVoted ? "Already Voted" : "Cast Vote";
      button.disabled = hasVoted;
      button.onclick = () => vote(contract, account, i);
      
      li.appendChild(name);
      li.appendChild(votesDiv);
      li.appendChild(button);
      list.appendChild(li);
    }
    
    // Update stats
    document.getElementById('totalCandidates').innerText = count;
    document.getElementById('totalVotes').innerText = totalVotes;
    document.getElementById('voteStatus').innerText = hasVoted ? 'Voted ✓' : 'Not Voted';
    document.getElementById('voteStatus').style.color = hasVoted ? 'var(--success)' : 'var(--text-secondary)';
    
  } catch (err) {
    console.error("Error loading candidates:", err);
    showToast('Error loading candidates. Check console.', 'error');
  }
}

async function vote(contract, account, candidateId) {
  try {
    showToast('Processing your vote...', 'success');
    await contract.methods.vote(candidateId).send({ from: account });
    showToast('Vote successfully cast!', 'success');
    loadCandidates(contract, account);
  } catch (err) {
    console.error("Error casting vote:", err);
    if (err.message.includes('Already voted')) {
      showToast('You have already voted', 'error');
    } else if (err.message.includes('insufficient funds')) {
      showToast('Insufficient funds for gas fees', 'error');
    } else {
      showToast('Transaction failed', 'error');
    }
  }
}

async function addCandidate() {
  const input = document.getElementById('candidateInput').value;
  if (!input) {
      showToast('Please enter a candidate name', 'error');
      return;
  }
  
  if (!votingContract) {
      showToast('Contract not connected. Please connect MetaMask first.', 'error');
      return;
  }
  
  try {
      const accounts = await web3.eth.getAccounts();
      showToast('Adding candidate...', 'success');
      await votingContract.methods.addCandidate(input).send({ from: accounts[0] });
      showToast(`Candidate "${input}" added successfully!`, 'success');
      document.getElementById('candidateInput').value = '';
      await loadCandidates(votingContract, accounts[0]);
  } catch (err) {
      console.error("Error adding candidate:", err);
      if (err.message.includes("Only owner")) {
          showToast('Only the contract owner can add candidates', 'error');
      } else {
          showToast('Failed to add candidate', 'error');
      }
  }
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
