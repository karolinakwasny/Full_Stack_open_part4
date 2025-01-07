const morgan = require('morgan')

morgan.token('body', (req) => JSON.stringify(req.body))

const myMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms :body')

module.exports = myMiddleware
