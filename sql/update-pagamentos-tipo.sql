alter table pagamentos
  add column if not exists tipo_pagamento text
  default 'normal'
  check (tipo_pagamento in ('normal', 'amortizacao', 'juros'));

update pagamentos set tipo_pagamento = 'normal' where tipo_pagamento is null;
