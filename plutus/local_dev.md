# Create a tunnel for webhooks

We recommend using cloudflared, which is free for development.

Start the tunnel

Run the following command to expose your local server:


Copy
npx cloudflared tunnel --url http://localhost:3000
2
Copy your tunnel URL

After starting, cloudflared will print a public URL in your terminal, e.g.:


Copy
https://my-tunnel-name.trycloudflare.com
Add the path of your backend’s webhook endpoint to the URL, e.g.:


Copy
https://my-tunnel-name.trycloudflare.com/api/webhook
/api/webhook is just an example. Your actual endpoint may be different depending on your backend configuration.

https://hunting-reflects-small-expenses.trycloudflare.com/api/agent
3
Update your Layercode pipeline

Go to the Layercode dashboard.
Click on your pipeline.
Click the Edit button in the ‘Your Backend’ box.
Enter your Webhook URL (from the previous step).
4
Test your agent

Open the pipeline Playground tab and start speaking to your voice agent!
5
Troubleshooting

If you’re having trouble, make sure your backend server is running and listening on the specified port (e.g., 3000). You can also visit the Webhook Logs tab in the pipeline to see the webhook requests being sent and any errors returned.

Every time you restart the cloudflared tunnel, the assigned public URL will change. Be sure to update the webhook URL in the Layercode dashboard each time you restart the tunnel.

​
Alternative Tunneling Solutions
Besides cloudflared, you can also use other tunneling solutions like ngrok to expose your local backend.