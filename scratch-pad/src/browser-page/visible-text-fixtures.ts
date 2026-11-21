export interface SelectionAround {
  readonly lines: string
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
}

export const visibleTextMarkdown = [
  '# Invoice *export*',
  '',
  'The export job writes the **paid** invoices of each shop.  ',
  'It retries `5` times when the [network](https://example.com) is slow.',
  '',
  '| Shop | Retries |',
  '|---|---|',
  '| Berlin | 5 times when slow |',
  '| Paris | 3 times when slow |',
  '',
  '- The export job retries 5 times.',
  '- The export job writes one file per shop.',
  '  - Each file is a CSV file.',
  '',
  '```ts',
  'const retries = 5',
  'const wait = 30',
  '```',
  '',
  '> The finance team reads the report.',
  '>',
  '> It arrives every Monday.',
].join('\n')

export const visibleTextHtml = [
  '<h1 data-lines="1-1" id="invoice-export">Invoice <em>export</em></h1>',
  '<p data-lines="3-4">The export job writes the <strong>paid</strong> invoices of each shop.<br>',
  'It retries <code>5</code> times when the <a href="https://example.com">network</a> is slow.</p>',
  '<table data-lines="6-9">',
  '<thead>',
  '<tr>',
  '<th>Shop</th>',
  '<th>Retries</th>',
  '</tr>',
  '</thead>',
  '<tbody>',
  '<tr>',
  '<td>Berlin</td>',
  '<td>5 times when slow</td>',
  '</tr>',
  '<tr>',
  '<td>Paris</td>',
  '<td>3 times when slow</td>',
  '</tr>',
  '</tbody>',
  '</table>',
  '<ul data-lines="11-13">',
  '<li>The export job retries 5 times.</li>',
  '<li>The export job writes one file per shop.',
  '<ul>',
  '<li>Each file is a CSV file.</li>',
  '</ul>',
  '</li>',
  '</ul>',
  '<pre data-lines="15-18"><code class="language-ts">const retries = 5',
  'const wait = 30',
  '</code></pre>',
  '<blockquote data-lines="20-22">',
  '<p>The finance team reads the report.</p>',
  '<p>It arrives every Monday.</p>',
  '</blockquote>',
  '',
].join('\n')

export const visibleBlockTexts: Readonly<Record<string, string>> = {
  '1-1': 'Invoice export',
  '3-4':
    'The export job writes the paid invoices of each shop. It retries 5 times when the network is slow.',
  '6-9': 'Shop Retries Berlin 5 times when slow Paris 3 times when slow',
  '11-13':
    'The export job retries 5 times. The export job writes one file per shop. Each file is a CSV file.',
  '15-18': 'const retries = 5 const wait = 30',
  '20-22': 'The finance team reads the report. It arrives every Monday.',
}

export const selectionsAround: readonly SelectionAround[] = [
  {
    lines: '3-4',
    selectedText: 'retries 5 times',
    prefix: 'e paid invoices of each shop. It',
    suffix: 'when the network is slow.',
  },
  {
    lines: '6-9',
    selectedText: 'Berlin 5',
    prefix: 'Shop Retries',
    suffix: 'times when slow Paris 3 times wh',
  },
  {
    lines: '11-13',
    selectedText: 'writes one file per shop',
    prefix: 'retries 5 times. The export job',
    suffix: '. Each file is a CSV file.',
  },
  {
    lines: '15-18',
    selectedText: 'const wait = 30',
    prefix: 'const retries = 5',
    suffix: '',
  },
]
