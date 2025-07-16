// lib/components/ui/data-table/cell-renderers.ts
import { Badge } from '$lib/components/ui/badge/index.js';
import { Button } from '$lib/components/ui/button/index.js';
import { renderComponent } from '$lib/components/ui/data-table/index.js';
import { Check, X, Calendar, Hash, Type, Database, Copy } from '@lucide/svelte';

export interface CellRendererProps {
  value: any;
  dataType: string;
  maxLength?: number;
}

export function createCellRenderer(props: CellRendererProps) {
  const { value, dataType, maxLength = 50 } = props;

  if (value === null || value === undefined) {
    return renderComponent(Badge, {
      variant: 'outline',
      class: 'text-xs text-muted-foreground',
      children: 'NULL'
    });
  }

  const type = dataType.toLowerCase();

  switch (type) {
    case 'uuid':
      return renderUuidCell(value);
    
    case 'timestamp with time zone':
    case 'timestamp':
    case 'timestamptz':
      return renderTimestampCell(value);
    
    case 'date':
      return renderDateCell(value);
    
    case 'time':
      return renderTimeCell(value);
    
    case 'boolean':
      return renderBooleanCell(value);
    
    case 'json':
    case 'jsonb':
      return renderJsonCell(value, maxLength);
    
    case 'array':
    case '_text':
    case '_varchar':
      return renderArrayCell(value);
    
    case 'text':
    case 'varchar':
    case 'character varying':
    case 'char':
      return renderTextCell(value, maxLength);
    
    case 'integer':
    case 'bigint':
    case 'smallint':
    case 'int':
    case 'int4':
    case 'int8':
      return renderIntegerCell(value);
    
    case 'numeric':
    case 'decimal':
    case 'float':
    case 'double':
    case 'real':
      return renderNumericCell(value);
    
    case 'bytea':
      return renderBinaryCell(value);
    
    case 'inet':
    case 'cidr':
      return renderNetworkCell(value);
    
    case 'macaddr':
      return renderMacAddressCell(value);
    
    case 'interval':
      return renderIntervalCell(value);
    
    default:
      return renderDefaultCell(value, maxLength);
  }
}

function renderUuidCell(value: string) {
  const shortId = value.substring(0, 8);
  return renderComponent('div', {
    class: 'flex items-center gap-2 font-mono text-sm',
    children: [
      renderComponent('span', {
        class: 'text-muted-foreground',
        children: shortId
      }),
      renderComponent('span', {
        class: 'text-xs text-muted-foreground',
        children: '...'
      }),
      renderComponent(Button, {
        variant: 'ghost',
        size: 'sm',
        class: 'h-4 w-4 p-0',
        onclick: () => {
          navigator.clipboard.writeText(value);
        },
        children: renderComponent(Copy, { class: 'h-3 w-3' })
      })
    ]
  });
}

function renderTimestampCell(value: string) {
  const date = new Date(value);
  const formatted = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  
  return renderComponent('div', {
    class: 'flex items-center gap-2 text-sm',
    children: [
      renderComponent(Calendar, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('span', {
        title: value,
        children: formatted
      })
    ]
  });
}

function renderDateCell(value: string) {
  const date = new Date(value);
  const formatted = date.toLocaleDateString();
  
  return renderComponent('div', {
    class: 'flex items-center gap-2 text-sm',
    children: [
      renderComponent(Calendar, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('span', {
        children: formatted
      })
    ]
  });
}

function renderTimeCell(value: string) {
  return renderComponent('div', {
    class: 'font-mono text-sm',
    children: value
  });
}

function renderBooleanCell(value: boolean) {
  return renderComponent(Badge, {
    variant: value ? 'default' : 'secondary',
    class: 'flex items-center gap-1',
    children: [
      renderComponent(value ? Check : X, { class: 'h-3 w-3' }),
      value ? 'True' : 'False'
    ]
  });
}

function renderJsonCell(value: any, maxLength: number) {
  const jsonStr = JSON.stringify(value, null, 2);
  const truncated = jsonStr.length > maxLength ? jsonStr.substring(0, maxLength) + '...' : jsonStr;
  
  return renderComponent('div', {
    class: 'flex items-center gap-2',
    children: [
      renderComponent(Database, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('pre', {
        class: 'text-xs font-mono bg-muted p-1 rounded max-w-xs overflow-x-auto',
        children: truncated
      })
    ]
  });
}

function renderArrayCell(value: any[]) {
  if (!Array.isArray(value)) {
    return renderComponent('span', { children: String(value) });
  }
  
  return renderComponent(Badge, {
    variant: 'outline',
    children: `Array[${value.length}]`
  });
}

function renderTextCell(value: string, maxLength: number) {
  const truncated = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
  
  return renderComponent('div', {
    class: 'flex items-center gap-2',
    children: [
      renderComponent(Type, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('span', {
        title: value.length > maxLength ? value : undefined,
        children: truncated
      })
    ]
  });
}

function renderIntegerCell(value: number) {
  return renderComponent('div', {
    class: 'flex items-center gap-2 font-mono text-sm',
    children: [
      renderComponent(Hash, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('span', {
        children: value.toLocaleString()
      })
    ]
  });
}

function renderNumericCell(value: number) {
  return renderComponent('div', {
    class: 'flex items-center gap-2 font-mono text-sm',
    children: [
      renderComponent(Hash, { class: 'h-3 w-3 text-muted-foreground' }),
      renderComponent('span', {
        children: typeof value === 'number' ? value.toFixed(2) : String(value)
      })
    ]
  });
}

function renderBinaryCell(value: any) {
  return renderComponent(Badge, {
    variant: 'outline',
    children: `Binary (${value.length || 0} bytes)`
  });
}

function renderNetworkCell(value: string) {
  return renderComponent('div', {
    class: 'font-mono text-sm',
    children: value
  });
}

function renderMacAddressCell(value: string) {
  return renderComponent('div', {
    class: 'font-mono text-sm',
    children: value
  });
}

function renderIntervalCell(value: any) {
  return renderComponent('div', {
    class: 'text-sm',
    children: String(value)
  });
}

function renderDefaultCell(value: any, maxLength: number) {
  const str = String(value);
  const truncated = str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  
  return renderComponent('span', {
    title: str.length > maxLength ? str : undefined,
    children: truncated
  });
}