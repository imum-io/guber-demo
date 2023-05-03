import { envs } from "../enums"
import local from './local-config.json'
import { currentEnv } from ".."
// TODO load this from json file
const productionConfigs = local

const developmentConfigs = local

const localConfigs = local

const loadConnections = () => {
    if (!currentEnv) {
        console.log('Default environment set to development!')
    }
    let connection
    const env = currentEnv
    switch (env) {
        case envs.production:
            connection = productionConfigs
            break;
        case envs.development:
            connection = developmentConfigs
            break;
        case envs.local:
            connection = localConfigs
            break;
        default:
            connection = developmentConfigs
            break;
    }
    if (currentEnv) {
        console.log(`${env} connection loaded, `, connection)
    }

    return connection
}

const loadedConnections = loadConnections()

export default loadedConnections