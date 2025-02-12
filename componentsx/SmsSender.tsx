'use client';

import { useState } from 'react';

export default function SmsSender() {
  const [phoneNumber, setPhoneNumber] = useState('+2347064407000');
  const [message, setMessage] = useState('Jesus is God');
  const [status, setStatus] = useState('OK');

  const sendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Sending...');

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          body: message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('SMS sent successfully!');
      } else {
        setStatus('Failed to send SMS.');
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('An error occurred.');
    }
  };

  return (
    <form onSubmit={sendSms}>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="Phone number"
        required
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message"
        required
      />
      <button type="submit">Send SMS</button>
      {status && <p>{status}</p>}
    </form>
  );
}