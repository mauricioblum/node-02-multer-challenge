import { getCustomRepository } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

interface Request {
  transactionsFileName: string;
}

async function loadCSV(fileName: string): Promise<string[]> {
  const readCSVStream = fs.createReadStream(
    path.resolve(__dirname, '..', '..', 'tmp', fileName),
  );

  const parseStream = csvParse({
    from_line: 2,
    ltrim: true,
    rtrim: true,
  });

  const parseCSV = readCSVStream.pipe(parseStream);

  const lines: string[] = [];

  parseCSV.on('data', line => {
    lines.push(line);
  });

  await new Promise(resolve => {
    parseCSV.on('end', resolve);
  });

  return lines;
}

class ImportTransactionsService {
  async execute({ transactionsFileName }: Request): Promise<Transaction[]> {
    const fileLines = await loadCSV(transactionsFileName);

    const transactionsToCreate = fileLines.map(transaction => {
      return {
        title: transaction[0],
        type: transaction[1] as 'income' | 'outcome',
        value: Number(transaction[2]),
        category: transaction[3],
      };
    });

    const createTransactionService = new CreateTransactionService();

    const createdTransactions: Transaction[] = [];

    for (let i = 0; i < transactionsToCreate.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const parsedTransaction = await createTransactionService.execute({
        ...transactionsToCreate[i],
      });
      createdTransactions.push(parsedTransaction);
    }

    return createdTransactions;
  }
}

export default ImportTransactionsService;
