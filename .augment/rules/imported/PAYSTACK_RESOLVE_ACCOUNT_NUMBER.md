---
type: "always_apply"
---

# Resolve Account Number

## API DOCUMENTATION URL: https://paystack.com/docs/identity-verification/verify-account-number/#resolve-account-number

In a nutshell
The account validation APIs allow merchants to confirm the authenticity of a customer’s account number before sending money to the customer.

Introduction
Before sending money to a customer, you need to ensure the customer’s account details are correct. This is to ensure you aren’t sending money to the wrong person. In order to achieve this, we provide the following APIs:


The Resolve Account Number API takes the customer’s account number and bank code and returns the account details of the customer. To resolve an account number, make a GET request to the /bank/resolve endpoint:




## SOURCE CODE
`code`
```javascript
const https = require('https')

const options = {
  hostname: 'api.paystack.co',
  port: 443,
  path: '/bank/resolve?account_number=0001234567&bank_code=058',
  method: 'GET',
  headers: {
    Authorization: 'Bearer SECRET_KEY'
  }
}

https.request(options, res => {
  let data = ''

  res.on('data', (chunk) => {
    data += chunk
  });

  res.on('end', () => {
    console.log(JSON.parse(data))
  })
}).on('error', error => {
  console.error(error)
})
```




## SORUCE CODE RESPONSE
`code`
```json
{
  "status": true,
  "message": "Account number resolved",
  "data": {
    "account_number": "0001234567",
    "account_name": "Doe Jane Loren",
    "bank_id": 9
  }
}
```