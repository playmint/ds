import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Client as DawnseekersClient } from '../';
import { ethers } from 'ethers';

const client = new DawnseekersClient({
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query',
    signer: async () => {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
            throw new Error(`no metamask compatiable provider found`);
        }
        const provider = new ethers.BrowserProvider(ethereum);
        return provider.getSigner();
    },
});
(window as any).ds = client;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App ds={client} />
    </React.StrictMode>
);
