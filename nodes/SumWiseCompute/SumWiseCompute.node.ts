import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { ConnectorError, fail } from './protocol';
import { evaluate } from './transport';

export class SumWiseCompute implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SumWise Compute',
    name: 'sumWiseCompute',
    icon: { light: 'file:sumwise.svg', dark: 'file:sumwise.dark.svg' },
    group: ['transform'],
    version: 1,
    usableAsTool: { replacements: { description: 'Evaluate supplied expressions with SumWise Compute and return typed exact or approximate results' } },
    subtitle: 'Evaluate',
    description: 'Evaluate one expression with the separately provisioned SumWise Compute service',
    defaults: { name: 'SumWise Compute' },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: 'sumWiseComputeApi', required: true }],
    properties: [
      {
        displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
        options: [{ name: 'Evaluate', value: 'evaluate', description: 'Evaluate one expression', action: 'Evaluate expression' }],
        default: 'evaluate',
      },
      {
        displayName: 'Expression', name: 'expression', type: 'string', default: '', required: true,
        placeholder: 'e.g. 1/3 + 5/6', typeOptions: { rows: 3 },
        description: 'ASCII expression to evaluate. Map a string from an earlier item. Integer and rational results remain strings.',
      },
      {
        displayName: 'One request per item, processed sequentially. Other workflow executions may overlap. Keep Retry On Fail disabled; every explicit retry may consume rate or quota.',
        name: 'retryNotice', type: 'notice', default: '',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const output: INodeExecutionData[] = [];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        if (this.getNodeParameter('operation', itemIndex) !== 'evaluate') {
          fail('Only Evaluate is supported', 'invalid_operation');
        }
        const expression = this.getNodeParameter('expression', itemIndex);
        let credentials;
        try { credentials = await this.getCredentials('sumWiseComputeApi'); } catch {
          fail('Compute credential is unavailable', 'invalid_configuration');
        }
        const result = await evaluate(expression, credentials, async (options) =>
          await this.helpers.httpRequestWithAuthentication.call(this, 'sumWiseComputeApi', options));
        output.push({ json: result, pairedItem: { item: itemIndex } });
      } catch (error) {
        // Never attach the original authenticated helper error, request, cause, or input item.
        const safe = error instanceof ConnectorError ? error : new ConnectorError('Unable to read Evaluate input', { code: 'invalid_input' });
        const guidance = typeof safe.info.detail === 'string' ? safe.info.detail :
          'Check the expression and selected credential settings before trying again.';
        const nodeError = new NodeOperationError(this.getNode(), safe.message, {
          itemIndex, description: guidance + '\n\nDetails: ' + JSON.stringify(safe.info),
        });
        if (!this.continueOnFail()) throw nodeError;
        output.push({ json: { error: safe.message, ...safe.info }, error: nodeError, pairedItem: { item: itemIndex } });
      }
    }
    return [output];
  }
}
