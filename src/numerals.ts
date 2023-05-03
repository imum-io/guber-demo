import moment from 'moment'
import { request } from './network-utils'
import { sleep } from './utils'
import numeral from 'numeral'
import { isProd } from './config'
import { isEmpty } from "lodash"
import Logger from './libs/logger'

let isLocaleSet = false

let currencies: any = {}

setNumeral()

function setNumeral() {
    if (isLocaleSet) {
        return
    }
    isLocaleSet = true
    numeral.register("locale", "truck", {
        delimiters: {
            thousands: " ",
            decimal: "."
        },
        abbreviations: {
            thousand: "k",
            million: "mil",
            billion: "bil",
            trillion: "tril"
        },
        ordinal: function (number) {
            return "."
        },
        currency: {
            symbol: "€"
        }
    })
    numeral.locale('truck')
}

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    var escapedSearch = search.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    return target.replace(new RegExp(escapedSearch, 'g'), replacement)
}

function formatPrice(value) {

    if (!value) {
        // return value
        return null
    }
    else if (typeof value == 'number') {
        return value;
    }

    let decimalKey = "DECIMAL_KEY"

    let i = value.length
    let numericsFound = 0
    while (i--) {
        let c = value.charAt(i)

        if (numericsFound <= 2) {
            // Search for cents symbol
            // If 3 digits, then it's not cents but thousands symbol
            if (c === ',' || c === '.') {
                value = value.substring(0, i) + decimalKey + value.substring(i + 1)
            }
        }
        else {
            // Small optimisation
            break
        }

        if (c >= '0' && c <= '9') {
            numericsFound++
        }
    }

    value = value.replaceAll('.', ',')
    value = value.replaceAll(decimalKey, '.')

    let num = numeral(value).value()
    return Math.abs(num)
}

function formatNumber(value, dontReplaceDots, dotsToCommas) {

    if (!value) return null

    if (!isNaN(value)) {
        return Number(value)
    }

    // replace dots with commas
    let newValue = value
    if (!dontReplaceDots) {
        newValue = value.replaceAll('.', ',')
    }
    if (dotsToCommas) {
        newValue = value.replaceAll(',', '.')
    }
    let num = numeral(newValue).value()
    return Math.abs(num)
    // return parseInt(Math.abs(numeral(newValue)))
}

function getPLNCurrency(date = moment().subtract(1, 'day'), tries = 0) {
    if (tries > 10) {
        Logger.error("No currency: no PLN currency")
    }

    let format = 'YYYY-MM-DD'

    let uriStart = 'http://api.nbp.pl/api/exchangerates/rates/a/eur/'
    let uriFinish = '?format=json'

    let uri = uriStart + date.format(format) + uriFinish
    // console.log("URI", uri, tries)
    return request(uri)
        .then(response => {
            return response.rates[0].mid
        })
        .then(rate => {
            return rate
        })
        .catch(error => {
            // If error, try a day before
            return getPLNCurrency(date.subtract(1, 'day'), tries + 1)
        })
}

function getRUBCurrency(date = moment().subtract(1, 'day'), tries = 0) {

    if (tries > 10) {
        Logger.error("No currency: no RUB currency")
        return 0
    }

    let uri = 'https://v6.exchangerate-api.com/v6/2ec575b4f8b1550123ed7716/latest/eur'

    return request(uri)
        .then(response => {
            let rate = response.conversion_rates.RUB
            return rate
        })
        .catch(error => {
            console.log("ERROR getRUBCurrency", error)
            return sleep(1000)
                .then(() => {
                    return getRUBCurrency(date.subtract(1, 'day'), tries + 1)
                })
        })
}

async function getCurrencies() {
    if (!isEmpty(currencies)) {
        return currencies
    }
    if (isProd) {
        currencies.EUR = { regex: /(?:eur|€)/i, rate: 1 }
        currencies.PLN = { regex: /(?:pln|pl)/i, rate: await getPLNCurrency() }
        currencies.RUB = { regex: /(?:rub|₽)/i, rate: await getRUBCurrency() }
        currencies.keys = ['EUR', 'RUB', 'PLN']
    } else {
        currencies = {}
        currencies.EUR = { regex: /(?:eur|€)/i, rate: 1 }
        currencies.PLN = { regex: /(?:pln|pl)/i, rate: 4.3451 }
        currencies.RUB = { regex: /(?:rub|₽)/i, rate: 83.6584 }
        currencies.keys = ['EUR', 'RUB', 'PLN']
    }
    return currencies
}

export {
    formatPrice,
    formatNumber,
    getCurrencies,
    setNumeral
}
