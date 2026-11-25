import {connect} from 'cloudflare:sockets';
import {handler, deliver} from './quote.mjs';
export default handler((values, env) => deliver(connect, values, env), {live: env => Boolean(env.PURELYMAIL_APP_PASSWORD)});
