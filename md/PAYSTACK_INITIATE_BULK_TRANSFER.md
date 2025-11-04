# Initiate Bulk Transfer
Batch multiple transfers in a single request.

Paystack Transfer API Link: https://paystack.com/docs/api/transfer

You need to disable the Transfers OTP requirement to use this endpoint.

Headers
authorization
String
Set value to Bearer SECRET_KEY

content-type
String
Set value to application/json

Body Parameters
source
String
Where should we transfer from? Only balance for now

transfers
Array
A list of transfer object.

Hide parameters
amount
Integer
Amount to transfer in kobo if currency is NGN and pesewas if currency is GHS.

recipient
String
Code for transfer recipient

reference
String
min: 16
max: 50
A unique identifier containing lowercase letters (a-z), digits (0-9) and these symbols: dash (-), underscore(_).

reason
String
The reason for the transfer. This also shows up in the narration of the customer's credit notification.

## SOURCE CODE
`code`
```javascript
const https = require('https')

const params = JSON.stringify({
  "currency": "NGN",
  "source": "balance",
  "transfers": [
    {
      "amount": 20000,
      "reference": "acv_2627bbfe-1a2a-4a1a-8d0e-9d2ee6c31496",
      "reason": "Bonus for the week",
      "recipient": "RCP_gd9vgag7n5lr5ix"
    },
    {
      "amount": 35000,
      "reference": "acv_1bd0c1f8-78c2-463b-8bd4-ed9eeb36be50",
      "reason": "Bonus for the week",
      "recipient": "RCP_zpk2tgagu6lgb4g"
    },
    {
      "amount": 15000,
      "reference": "acv_11bebfc3-18b3-40aa-a4df-c55068c93457",
      "reason": "Bonus for the week",
      "recipient": "RCP_dfznnod8rwxlwgn"
    }
  ]
})

const options = {
  hostname: 'api.paystack.co',
  port: 443,
  path: '/transfer/bulk',
  method: 'POST',
  headers: {
    Authorization: 'Bearer SECRET_KEY',
    'Content-Type': 'application/json'
  }
}

const req = https.request(options, res => {
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

req.write(params)
req.end()
```



## SOURCE CODE RESPONSE
`code`
```json
{
  "status": true,
  "message": "3 transfers queued.",
  "data": [
    {
      "reference": "acv_2627bbfe-1a2a-4a1a-8d0e-9d2ee6c31496",
      "recipient": "RCP_gd9vgag7n5lr5ix",
      "amount": 20000,
      "transfer_code": "TRF_o0mv5dc2lv4t2wdb",
      "currency": "NGN",
      "status": "success"
    },
    {
      "reference": "acv_1bd0c1f8-78c2-463b-8bd4-ed9eeb36be50",
      "recipient": "RCP_zpk2tgagu6lgb4g",
      "amount": 35000,
      "transfer_code": "TRF_tlvxomz43gjso2py",
      "currency": "NGN",
      "status": "success"
    },
    {
      "reference": "acv_11bebfc3-18b3-40aa-a4df-c55068c93457",
      "recipient": "RCP_dfznnod8rwxlwgn",
      "amount": 15000,
      "transfer_code": "TRF_yt2y2gcd3dmli8av",
      "currency": "NGN",
      "status": "success"
    }
  ]
}
```
