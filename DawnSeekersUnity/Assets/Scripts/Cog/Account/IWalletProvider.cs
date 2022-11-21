namespace Cog.Account
{
    public delegate void ConnectedCallBack();
    public delegate void ErrorCallBack(string errorMessage);
    public delegate void SignedCallBack(string signedMessage);
    public interface IWalletProvider 
    {
        public void Connect(ConnectedCallBack connectedCallBack, ErrorCallBack errorCallBack);
        public void SignMessage(string message,SignedCallBack signedCallBack, ErrorCallBack errorCallBack);
        public string Account {get;}
    }
}

