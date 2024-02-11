import React, { useState, useEffect, useCallback } from 'react';
import Web3 from 'web3';
import citizenRegistryABI from './contracts/CitizenRegistryABI.json';
import './App.css';

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [citizenContract, setCitizenContract] = useState(null);
  const [citizens, setCitizens] = useState([]);
  const [newCitizenData, setNewCitizenData] = useState({
    age: '',
    city: '',
    name: '',
    someNote: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    async function initWeb3() {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          setWeb3(web3);

          const contractAddress = '0xa011799d9467d2b33768fb1a3512f1b468b87e96';
          const citizenContract = new web3.eth.Contract(citizenRegistryABI, contractAddress);
          setCitizenContract(citizenContract);
        } catch (error) {
          alert('User denied account access');
        }
      }
      else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider);
      }
      else {
        alert('Non-Ethereum browser detected. You should consider trying MetaMask!');
      }
    }

    initWeb3();
    // eslint-disable-next-line
  }, []);

  const fetchAllCitizens = useCallback(async () => {
    if (!citizenContract) return;
    setIsLoading(true)
    try {
      const events = await citizenContract.getPastEvents('Citizen', {
        fromBlock: 0,
        toBlock: 'latest'
      });

      const citizensWithNotes = await Promise.all(events.map(async event => {
        const note = await citizenContract.methods.getNoteByCitizenId(event.returnValues.id).call();
        return {
          id: parseInt(event.returnValues.id).toString(),
          age: parseInt(event.returnValues.age).toString(),
          city: event.returnValues.city,
          name: event.returnValues.name,
          someNote: note
        };
      }));

      setCitizens(citizensWithNotes);
    } catch (error) {
      alert(`Error fetching citizens: ${error}`);
    } finally {
      setIsLoading(false)
    }
  }, [citizenContract]);

  useEffect(() => {
    if (citizenContract) {
      fetchAllCitizens();
    }
  }, [citizenContract, fetchAllCitizens]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewCitizenData({
      ...newCitizenData,
      [name]: value
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (citizenContract) {
      try {
        setIsLoading(true)
        const accounts = await web3.eth.getAccounts();
        const fromAddress = accounts[0];

        await citizenContract.methods.addCitizen(
            newCitizenData.age,
            newCitizenData.city,
            newCitizenData.name,
            newCitizenData.someNote
        ).send({ from: fromAddress });

        setNewCitizenData({
          age: '',
          city: '',
          name: '',
          someNote: ''
        });

        await fetchAllCitizens();

        setShowAddForm(false);
      } catch (error) {
        alert(`Error adding new citizen: ${error}`);
      } finally {
        setIsLoading(false)
      }
    }
  };

  const toggleForm = () => {
    setShowAddForm(!showAddForm);
  };

  return (
      <div className="App">
        { isLoading ?
            <div className="loading-container">
              <div className="loader"></div>
              <div className="loading-text">Please wait...</div>
            </div>
            :
            <>
              {showAddForm ? (
                  <div>
                    <h2>Add New Citizen</h2>
                    <form onSubmit={handleSubmit}>
                      <div>
                        <label>Age:</label>
                        <input type="number" name="age" value={newCitizenData.age} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <label>City:</label>
                        <input type="text" name="city" value={newCitizenData.city} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <label>Name:</label>
                        <input type="text" name="name" value={newCitizenData.name} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <label>Some Note:</label>
                        <input type="text" name="someNote" value={newCitizenData.someNote} onChange={handleInputChange} />
                      </div>
                      <button
                          className="add-citizen-button"
                      >
                        Add Citizen
                      </button>
                    </form>
                    <button
                        onClick={toggleForm}
                        className="cancel-button"
                    >
                      Cancel
                    </button>
                  </div>
              ) : (
                  <div className="list-container">
                    <h1>List of Citizens</h1>
                    <button
                        onClick={toggleForm}
                        className="add-citizen-button-go-to"
                    >
                      Add Citizen
                    </button>
                    <ul className="card-list">
                      {citizens.map((citizen) => (
                          <li key={citizen.id} className="card">
                            <p>ID: {citizen.id}</p>
                            <p>Age: {citizen.age}</p>
                            <p>City: {citizen.city}</p>
                            <p>Name: {citizen.name}</p>
                            <p>Note: {citizen.someNote}</p>
                          </li>
                      ))}
                    </ul>
                  </div>
              )}
            </>
        }
      </div>
  );
};

export default App;
