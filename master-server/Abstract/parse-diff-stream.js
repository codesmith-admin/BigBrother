  [/^\-\-\-\s/, fromFile],
  [/^@@\s+\-(\d+),(\d+)\s+\+(\d+),(\d+)\s+@@/, chunkOverview],
  [/^\-/, del],
var cr = "\r".charCodeAt(0);
  console.log("writing",chunk.toString("utf8"));
    while((chunk[i] !== nl && chunk[i] !== cr) && i<l) i++;
    curstr = this.buffer + chunk.slice(lastIndex,i,"utf8");