# Creating Transfer Recipients

API DOCUMENTATION URL: https://paystack.com/docs/transfers/creating-transfer-recipients/

In a nutshell
To send money from your integration, you need to collect the customer’s details to create a beneficiary.

A transfer recipient is a beneficiary created on your integration in order to allow you send money. Before sending money from your integration, you need to collect the customer’s details and use their details to create a transfer recipient.

We support the following recipient types:

- nuban :	This means the Nigerian Uniform Bank Account Number. It represents bank accounts in Nigeria.	(NGN)
- authorization :	This is a unique code that represents a customer’s card. We return an authorization code after a user makes a payment with their card.	(NGN)


To create the transfer recipient, make a POST request to the transfer recipientAPI passing one of the following customer’s detail:

Bank account
Mobile money
Authorization code

# Bank account
When creating a transfer recipient with a bank account, you need to collect the customer’s bank details. Typically, the account number and associated bank should suffice, but some countries require more details particularly for account verification. You should design your user interface to allow the collection of the necessary details in the country of operation.

## List banks
When creating your user interface (UI) to collect the user’s bank details, you’ll need to populate the UI with a list of banks. We provide a list bankAPI endpoint that you can use to populate your UI with available banks in your country.

To fetch a list of banks in a country, make a GET request passing the currency in the query parameter:


### SOURCE CODE
`code`
```javascript
const https = require('https')

const options = {
  hostname: 'api.paystack.co',
  port: 443,
  path: '/bank?currency=NGN',
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


### SOURCE CODE RESPONSE
`code`
```javascript
{
  "status": true,
  "message": "Banks retrieved",
  "data": [
    {
      "name": "Abbey Mortgage Bank",
      "slug": "abbey-mortgage-bank",
      "code": "801",
      "longcode": "",
      "gateway": null,
      "pay_with_bank": false,
      "active": true,
      "is_deleted": false,
      "country": "Nigeria",
      "currency": "NGN",
      "type": "nuban",
      "id": 174,
      "createdAt": "2020-12-07T16:19:09.000Z",
      "updatedAt": "2020-12-07T16:19:19.000Z"
    }
  ]
}
```
