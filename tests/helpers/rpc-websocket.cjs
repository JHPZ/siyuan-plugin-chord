// An in-memory JSON-RPC peer for frontend tests; production still uses the native WebSocket.
module.exports = function createRpcWebSocket(dispatch, subscribe, connect) {
    return class RpcWebSocket {
        static OPEN = 1;
        static instances = [];
        constructor(url) {
            this.url = url;
            this.readyState = 0;
            this.bufferedAmount = 0;
            this.sent = [];
            this.received = [];
            this.constructor.instances.push(this);
            const receive=data=>{this.received.push(JSON.parse(data));this.onmessage?.({data});};
            if(connect)this.port=connect(receive,()=>this.close());
            else this.unsubscribe = subscribe?.(message => receive(JSON.stringify(message)));
            queueMicrotask(() => { if (this.readyState === 0) { this.readyState = 1; this.onopen?.(); } });
        }
        send(raw) {
            if (this.readyState !== 1) throw new Error('Socket closed');
            const request = JSON.parse(raw);
            this.sent.push(request);
            if(this.port){this.port.onmessage({data:raw});return;}
            Promise.resolve().then(() => dispatch(request.method, request.params)).then(
                result => this.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: result ?? null }) }),
                error => this.onmessage?.({ data: JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: error.code ?? -32603, message: error.message } }) })
            );
        }
        close() {
            if (this.readyState === 3) return;
            this.readyState = 3;
            this.port?.close();
            this.unsubscribe?.();
            this.onclose?.();
        }
    };
};
