import {
    warningMessage,
} from './utils';

import { setDatacenterProxies } from './network-utils'

import yargs from 'yargs'
import { getSourceFunction } from './common';

async function testing(source: any) {
    if (source) {
        const sourceFunctions = getSourceFunction(source)
        if (sourceFunctions.testing) {
            await sourceFunctions.testing();
        } else {
            warningMessage("Your source file has no testing function. Please add one.");
        }
    } else {
        warningMessage("Please provide a source. without source cannnot start debugging");
    }
}

async function startActivity() {

    const argv: any = yargs.argv
    console.log("Passed activity:", argv.activity)

    await setDatacenterProxies()

    if (argv.activity == "testing") {
        //usage: yarn debug --source CTN
        await testing(argv.source)
    }
    else {
        warningMessage("Only 'testing' activity is allowed");
    }
}

startActivity()
