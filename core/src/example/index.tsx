import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Client as DawnseekersClient } from '../lib';
import { ethers } from 'ethers';

const client = new DawnseekersClient({
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query',
    provider: () => {
        const ethereum = (window as any).ethereum;
        if (!ethereum) {
            throw new Error(`no metamask compatiable provider found`);
        }
        return new ethers.BrowserProvider(ethereum);
    },
});
(window as any).ds = client;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App ds={client} />
    </React.StrictMode>
);
