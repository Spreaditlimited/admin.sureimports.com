import { NextRequest, NextResponse } from 'next/server';

type PaystackDedicatedAccountResponse = {
  status: boolean;
  message: string;
  data?: any;
};

// type RequestBody = {
//   customer: number;
//   preferred_bank: string;
// };

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');
  console.log('Filtered Transactions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>x:ss'+status);
// export async function GET(
//   request: Request,
//   { params }: { params: { status: string } },
// ) {

  try {
    //const { status } = params; // Properly destructure params

    
    //////////////////// GET CUSTOMER DEDICATED ACCOUNTS DETAILS ////////////////////
    const response_dedicated_account = await fetch(
      `https://api.paystack.co/dedicated_account`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
        },
      },
    );
    const accountData = await response_dedicated_account.json();
    console.log('Filtered Transactions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>x:aa'+accountData.data);

    // FILTER DEDICATED ACCOUNTS BY CUSTOMER EMAIL
    // const filteredAccount = datay.data.filter(
    //   (account: any) =>
    //     account.customer.email.toLowerCase() === email.toLowerCase(),
    // );

    ////////// INITIALIZE CUSTOMER DATA //////////
    // let customerData = {
    //   bankName: null,
    //   accountName: null,
    //   accountNumber: null,
    //   currency: null,
    // };
    // if (filteredAccount.length > 0) {
    //   customerData = {
    //     bankName: filteredAccount[0].bank.name,
    //     accountName: filteredAccount[0].account_name,
    //     accountNumber: filteredAccount[0].account_number,
    //     currency: filteredAccount[0].currency,
    //   };
    // } else {
    // }

    ////////// NO ACCOUNT FOUND //////////
    // if (filteredAccount.length == 0 || filteredAccount[0] == undefined) {
    //   // Handle the case where dedicated_account is not present in the response
    //   return NextResponse.json(
    //     {
    //       statusx: 'NO_ACCOUNT',
    //       message: 'No Dedicated Account found for this email',
    //     },
    //     { status: 200 },
    //   );
    // }

    //////////////////// GET CUSTOMER TRANSACTIONS ////////////////////
    const response_transaction = await fetch(
      `https://api.paystack.co/transaction`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
        },
      },
    );
    const dataz = await response_transaction.json();
    const channel = 'dedicated_nuban';

    //if (!transactionsData?.data) return [];

    const filteredTransaction = dataz.data.filter(
      (transaction: any) =>
        //transaction.customer.email.toLowerCase() === email.toLowerCase() &&
        transaction.channel.toLowerCase() === channel.toLowerCase(),
    );
    
    function calculateTotalAmount(transactions: any): any {
      return transactions.reduce((total: any, transaction: any) => {
        // Only sum successful transactions
        if (transaction.status === 'success') {
          return total + transaction.amount;
        }
        return total;
      }, 0);
    }

    //calculate total amount
    const totalAmount = calculateTotalAmount(filteredTransaction);

    //initialize transaction data
    let transactionData = {
      transactions: [],
      totalAmount: 0,
    };
    if (
      filteredTransaction.length > 0 ||
      !filteredTransaction[0] == undefined
    ) {
      transactionData = {
        transactions: filteredTransaction,
        totalAmount: totalAmount / 100,
      };
    } else {
    }

    // console.log(
    //   'Filtered Transactions >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>x:EE',
    //   transactionData,
    // );
    // FILTER DEDICATED ACCOUNTS BY CUSTOMER EMAIL
    // const filteredTransaction = datay.data.filter(
    //   (account: any) =>
    //     account.customer.email.toLowerCase() === email.toLowerCase(),
    // );

    ////////// ACCOUNT FOUND //////////
    return NextResponse.json(
      {
        accountDetails: accountData,
        transactionDetails: transactionData,
        totalAmount: totalAmount,
        statusx: 'SUCCESS',
        message: 'Account Loading was Successful!',
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'An unknown error occurred',
      },
      { status: 500 },
    );
  }
}
