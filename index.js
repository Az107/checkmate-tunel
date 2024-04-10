const puppeteer = require("puppeteer");
const net = require("net");
const { Puppeteer } = require("puppeteer");


let browser = null;
puppeteer.launch({headless: true}).then(chrm => {
  browser = chrm;
});
const NotFoundResponse = "HTTP/1.1 404 Not Found\nContent-Length: 22\n\n<h1>404 Not Found</h1>\r\n";
function request_parser(text) {
  let lines = text.split('\n');
  let response = {
    method: "GET",
    url: "https://example.org",
    headers: {},
    body: ""
  };
  let [method,url,version] = lines[0].split(" ");
  response.method = method;
  response.url = url;
  return response;
}

async function response_maker(response) {
  let status = await response.status();
  let status_text = await response.statusText();
  let headers = await response.headers();
  let header_text = "";
  let body = await  response.text()
  for (const key in headers) {
    if ("Content-Encoding".toLowerCase() == key) continue;
    if ("Content-Length".toLowerCase() == key) headers[key] = body.length;
    const keyC = key.split("-")
    .map(k => k.charAt(0).toUpperCase() + k.slice(1)).join("-");
    header_text = header_text.concat(`${keyC}: ${headers[key]}\n`);
  }
  let response_text = `HTTP/1.1 ${status} OK\n${header_text}\n${body}`;
  return response_text;
}
async function getHttp(page, request) {
  await page.setRequestInterception(true);
  page.on('request', interceptedRequest => {

    // Here, is where you change the request method and 
    // add your post data

    data = {
      "method": request.method
    }
    // Request modified... finish sending! 
    interceptedRequest.continue();
  });

  // Navigate, trigger the intercept, and resolve the response
  const response = await page.goto(request.url);
  return response

}

const server = net.createServer((socket) => {
  socket.on('data', async data => {
    let requestText = data.toString();
    let request = request_parser(requestText)
    let response;
    while (browser == null) {
      await new Promise(r => setTimeout(r, 2000));
    }
    const page = await  browser.newPage();
    try{
      response = await getHttp(page,request);
    } catch (e) {
      console.error(e);
      socket.write(Buffer.from(NotFoundResponse,'utf-8'));
      socket.end();
      return;
    }
    console.log("==============request==============")
    console.log(requestText);
    console.log("====================================")
    //console.log(await response.text());
    let response_text = await response_maker(response);
    console.log("==============response==============")
    console.log(response_text);
    console.log("====================================")
    socket.write(Buffer.from(response_text, 'utf8'));
    page.close();
    socket.end();
  })
  
})

server.listen(1337, '127.0.0.1');

