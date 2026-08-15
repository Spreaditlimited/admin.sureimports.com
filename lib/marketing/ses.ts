import {
  AlreadyExistsException,
  CreateContactCommand,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2';

import { createMarketingSesClient } from './aws';
import {
  getSandboxAllowedRecipients,
  getMarketingSendMode,
  isMailboxSimulatorAddress,
  MARKETING_CONFIGURATION_SET,
  MARKETING_CONTACT_LIST,
  MARKETING_DEFAULT_TOPIC,
  MARKETING_FROM_EMAIL,
  MARKETING_FROM_NAME,
  MARKETING_REPLY_TO,
  normalizeMarketingRecipient,
} from './config';
import { renderMarketingEmail } from './content';
import { prisma } from '@/lib/prisma';

export async function assertRecipientCanReceive(email: string) {
  const normalized = normalizeMarketingRecipient(email);
  if (getMarketingSendMode() === 'production' || isMailboxSimulatorAddress(normalized)) return normalized;
  if (getSandboxAllowedRecipients().has(normalized)) return normalized;
  throw new Error(
    'SES sandbox safety blocked this recipient. Only explicitly allowlisted internal test addresses can receive sandbox email.',
  );
}

export async function requestSandboxRecipientVerification(email: string) {
  if (getMarketingSendMode() !== 'sandbox') {
    throw new Error('Recipient identity verification is only available in sandbox mode.');
  }
  const recipientEmail = await assertRecipientCanReceive(email);
  if (isMailboxSimulatorAddress(recipientEmail)) {
    return { recipientEmail, status: 'SUCCESS' as const };
  }
  const client = createMarketingSesClient();
  try {
    await client.send(new CreateEmailIdentityCommand({ EmailIdentity: recipientEmail }));
  } catch (error) {
    if (!(error instanceof AlreadyExistsException) && (error as { name?: string })?.name !== 'AlreadyExistsException') throw error;
  }
  const verified = await verifySandboxRecipient(recipientEmail);
  await prisma.marketing_contacts.upsert({
    where: { email: recipientEmail },
    create: {
      pidContact: crypto.randomUUID(), email: recipientEmail, status: 'ACTIVE',
      consentStatus: 'TEST_ONLY', consentSource: 'ses_internal_sandbox_test',
      sesVerificationStatus: verified ? 'VERIFIED' : 'PENDING',
    },
    update: { sesVerificationStatus: verified ? 'VERIFIED' : 'PENDING' },
  });
  return { recipientEmail, status: verified ? 'VERIFIED' as const : 'PENDING' as const };
}

export async function verifySandboxRecipient(email: string) {
  if (isMailboxSimulatorAddress(email)) return true;
  const client = createMarketingSesClient();
  const identity = await client.send(new GetEmailIdentityCommand({ EmailIdentity: email }));
  return identity.VerifiedForSendingStatus === true;
}

async function syncSesContact(input: {
  email: string;
  firstName?: string | null;
  topicName?: string;
}) {
  const client = createMarketingSesClient();
  const request = {
    ContactListName: MARKETING_CONTACT_LIST,
    EmailAddress: input.email,
    UnsubscribeAll: false,
    TopicPreferences: [
      {
        TopicName: input.topicName || MARKETING_DEFAULT_TOPIC,
        SubscriptionStatus: 'OPT_IN' as const,
      },
    ],
    AttributesData: JSON.stringify({ firstName: input.firstName || '' }),
  };

  try {
    await client.send(new CreateContactCommand(request));
  } catch (error) {
    if (!(error instanceof AlreadyExistsException) && (error as { name?: string })?.name !== 'AlreadyExistsException') {
      throw error;
    }
  }
}

export async function sendMarketingEmail(input: {
  recipientEmail: string;
  firstName?: string | null;
  subject: string;
  previewText?: string | null;
  bodyText: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  topicName?: string;
  tags?: Record<string, string>;
}) {
  const recipientEmail = await assertRecipientCanReceive(input.recipientEmail);
  const sandbox = getMarketingSendMode() === 'sandbox';
  if (sandbox && !(await verifySandboxRecipient(recipientEmail))) {
    throw new Error(`${recipientEmail} has not completed SES sandbox verification.`);
  }

  const managedSubscription = !isMailboxSimulatorAddress(recipientEmail);
  if (managedSubscription) {
    await syncSesContact({
      email: recipientEmail,
      firstName: input.firstName,
      topicName: input.topicName,
    });
  }

  const rendered = renderMarketingEmail({
    ...input,
    includeManagedUnsubscribe: managedSubscription,
  });
  const client = createMarketingSesClient();
  const result = await client.send(
    new SendEmailCommand({
      FromEmailAddress: `${MARKETING_FROM_NAME} <${MARKETING_FROM_EMAIL}>`,
      ReplyToAddresses: [MARKETING_REPLY_TO],
      Destination: { ToAddresses: [recipientEmail] },
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: rendered.html, Charset: 'UTF-8' },
            Text: { Data: rendered.text, Charset: 'UTF-8' },
          },
        },
      },
      ConfigurationSetName: MARKETING_CONFIGURATION_SET,
      EmailTags: Object.entries(input.tags || {}).map(([Name, Value]) => ({ Name, Value })),
      ...(managedSubscription
        ? {
            ListManagementOptions: {
              ContactListName: MARKETING_CONTACT_LIST,
              TopicName: input.topicName || MARKETING_DEFAULT_TOPIC,
            },
          }
        : {}),
    }),
  );

  if (!result.MessageId) throw new Error('SES did not return a message ID.');
  return { messageId: result.MessageId, recipientEmail, mode: getMarketingSendMode() };
}
