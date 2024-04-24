import fastify, {FastifyRequest, FastifyReply} from 'fastify'
import {opener} from './opener';

export const AUTH_PORT = 7947;

type AuthRequest = FastifyRequest<{
	Params: {
		auth: string;
	}
}>

export interface SessionData {
    key: string;
    expires: number;
    owner: string;
}

// starts a local http server that listens for a request
// containing session data opens a browser to the network's
// login URL and waits for the page to redirect to the
// listening server. on recv, shutdown server and use the
// receved session
export const authenticate = async (loginURL: string): Promise<SessionData> => {
    let done = false;
    return new Promise((resolve, reject) => {
        const server = fastify({
            maxParamLength: 10000,
        });

        const shutdown = () => {
            setTimeout(() => {
                if (done) {
                    return;
                }
                done = true;
                server.close().then(() => {
                    console.log('successfully closed!')
                }, (err) => {
                    console.log('an error happened', err)
                })
            }, 0);
        };

        server.get('/', async function (): Promise<string> {
            return 'this is authenication for the ds-cli ... return to the command line to follow instructions';
        });


        server.get('/session/:auth', async function (req:AuthRequest, _res:FastifyReply): Promise<any> {
            try {
                console.log(atob(req.params.auth));
                const session = JSON.parse(atob(req.params.auth));
                resolve(session);
                return 'ok! you can close this window and return to the command line now';
            } catch (err) {
                reject(err);
                return 'failed to authenticate, return to command line';
            } finally {
                shutdown();
            }
        });

        server.listen(AUTH_PORT, '0.0.0.0', (err, _address) => {
            if (err) {
                reject(err);
                return;
            }
            console.log(`
                Please authenticate with metamask via ${loginURL}
            `);
        });

        opener(loginURL);
    });
}
