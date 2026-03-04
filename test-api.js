const rpcUrl = "https://studio.genlayer.com/api";

async function test() {
    console.log("--- GỌI TRỰC TIẾP API STUDIO (`sim_getConsensusContract`) ---");
    console.log("Mô phỏng 100% logic fetch của thư viện genlayer-js gốc...\n");

    try {
        const response = await fetch(rpcUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: Date.now(),
                method: "sim_getConsensusContract",
                params: ["ConsensusMain"],
            }),
        });

        const data = await response.json();
        console.log("Phản hồi từ Server GenLayer Studio:");
        console.log(JSON.stringify(data, null, 2));

        if (data.result && data.result.address) {
            console.log(`\n=> KẾT LUẬN: Địa chỉ máy chủ trả về là: ${data.result.address}`);
            if (data.result.address === "0x0000000000000000000000000000000000000000") {
                console.log("Đây chính là nguyên nhân gây ra cảnh báo đỏ trên MetaMask!");
                console.log("Bởi vì thư viện gốc lấy địa chỉ này (0x0...0) và gán đè lên địa chỉ thật (0xb727...)\n");
            }
        }
    } catch (err) {
        console.error("Lỗi:", err);
    }
}

test();
