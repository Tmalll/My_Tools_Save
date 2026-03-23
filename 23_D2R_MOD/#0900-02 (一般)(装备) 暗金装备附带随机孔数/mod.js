const files = [
  'global\\excel\\uniqueitems.txt',
  'global\\excel\\base\\uniqueitems.txt'
];

files.forEach((filename) => {
  const data = D2RMM.readTsv(filename);
  
  data.rows.forEach((row) => {
    if (config.addSocket) {
      row['prop12'] = 'sock';
      row['min12'] = 1;
      row['max12'] = 6;
    }
  });

  D2RMM.writeTsv(filename, data);
});