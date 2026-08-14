import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SQSClient } from '@aws-sdk/client-sqs';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

import { MARKETING_AWS_REGION } from './config';

function awsClientConfig() {
  const roleArn = process.env.AWS_ROLE_ARN?.trim();
  return {
    region: MARKETING_AWS_REGION,
    ...(roleArn
      ? {
          credentials: awsCredentialsProvider({ roleArn }),
        }
      : {}),
  };
}

export function createMarketingSesClient() {
  return new SESv2Client(awsClientConfig());
}

export function createMarketingSqsClient() {
  return new SQSClient(awsClientConfig());
}

