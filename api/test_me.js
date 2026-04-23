const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/me',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3OTgzYzhiZS05Mzc0LTRlZjctYWZkMS1lNTY5MTI4MTg5YTAiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwianRpIjoiMWRlZjA2YWEtODYwOC00NzY4LWFhNWEtZmRjNWQwNzg4ZjhmIiwiaWF0IjoxNzc2OTc5Nzc3LCJleHAiOjE3NzY5ODA2Nzd9.o06R79f50QG0TgBtYMPiH_F9BIJ1fMiVNfmWVf3gwcp_XoWmwzbkahAcJb_ccRlEpI_ISnQFWoZSJlIP8DtawtZwbHCP3XfCoVCOUho4S4XxpdlDskVPK7Ajd4AkcP0S5M-fhiQGXy16QWae2b-RI3L4yf6TMSC3j_QHLMfnhFRylC6nULepN_CvxLTc2Oy1UXiEj3i9Py_4K9Uhx4Z9bZp1JbxFj-le2p_ylpTFce_Ff-xrZuwbuXDP8_AEAHX3Y6jr-jtQrtW_J3na_saUniPGXWW29p8DrSa-B8f8UZsqHEuYfnkmEOBCByKeTB4qj50QkEHwh57yknsGKmFKhg'
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});
req.end();
