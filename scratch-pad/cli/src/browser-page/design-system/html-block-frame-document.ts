const writeTheFirstDocumentOfThePage = [
  '(function(){const channel=new MessageChannel();',
  'window.htmlBlockPort=channel.port1;',
  'channel.port1.onmessage=function(event){',
  "if(typeof event.data!=='string'){return}",
  'channel.port1.onmessage=null;',
  'document.open();document.write(event.data);document.close()};',
  "parent.postMessage('html-block-frame-ready','*',[channel.port2])})()",
].join('')

// The server sends this document for the frame of an :::html block. An export puts the same
// document in the srcdoc of the frame, because an export doesn't have a server.
export const htmlBlockFrameDocument = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  `<script>${writeTheFirstDocumentOfThePage}</script>`,
  '</head>',
  '<body></body>',
  '</html>',
  '',
].join('\n')
