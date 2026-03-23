const files = [
  'global\\excel\\setitems.txt', 
  'global\\excel\\base\\setitems.txt'
];

files.forEach((filename) => {
  const data = D2RMM.readTsv(filename);
  
  data.rows.forEach((row) => {
    if (config.addSocket) {
      row['prop9'] = 'sock';
      row['min9'] = 1;
      row['max9'] = 6;
    }
  });

  D2RMM.writeTsv(filename, data);
});