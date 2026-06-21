import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { SwapHoriz as SwapIcon, CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import { inventoryAPI, productAPI, warehouseAPI } from '../../services/api';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const fmt = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

/**
 * TransferModal — two-step: form → confirmation → submit
 */
export default function TransferModal({ warehouses: propWH, isAdmin, userId, onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [myWarehouses, setMyWH] = useState(propWH || []);
  const [sourceQty, setSourceQty] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    productAPI
      .getAll({ limit: 200, search: prodSearch || undefined })
      .then((r) => setProducts(r.data.data?.products || []))
      .catch(() => {});
  }, [prodSearch]);

  useEffect(() => {
    if (!isAdmin && propWH.length === 0) {
      warehouseAPI
        .getAll()
        .then((r) => setMyWH(r.data.data || []))
        .catch(() => {});
    }
  }, [isAdmin, propWH]);

  const schema = Yup.object({
    product_id: Yup.number().required('Product is required'),
    fromWarehouseId: Yup.number().required('Source warehouse is required'),
    toWarehouseId: Yup.number()
      .required('Destination warehouse is required')
      .test('diff', 'Must differ from source', function (v) {
        return String(v) !== String(this.parent.fromWarehouseId);
      }),
    quantity: Yup.number()
      .positive('Must be > 0')
      .required('Quantity is required')
      .test('avail', 'Exceeds available stock', function (v) {
        if (sourceQty === null) return true;
        return Number(v) <= sourceQty;
      }),
    notes: Yup.string().nullable(),
  });

  const formik = useFormik({
    initialValues: {
      product_id: '',
      fromWarehouseId: '',
      toWarehouseId: '',
      quantity: '',
      notes: '',
    },
    validationSchema: schema,
    onSubmit: async (values, helpers) => {
      if (!confirming) {
        setConfirming(true);
        return;
      }
      try {
        await inventoryAPI.transfer(values);
        onSuccess(`Transferred ${values.quantity} units successfully`);
      } catch (err) {
        helpers.setFieldError('quantity', err.response?.data?.error || 'Transfer failed');
        setConfirming(false);
      }
    },
  });

  const F = formik;
  const err = (n) => (F.touched[n] && F.errors[n] ? F.errors[n] : undefined);

  // Lookup available qty when product + source warehouse selected
  useEffect(() => {
    const pid = F.values.product_id;
    const wid = F.values.fromWarehouseId;
    if (!pid || !wid) {
      setSourceQty(null);
      return;
    }
    inventoryAPI
      .getAll({ warehouseId: wid })
      .then((r) => {
        const item = (r.data.data?.inventory || []).find(
          (i) => String(i.product_id) === String(pid),
        );
        setSourceQty(item ? (item.available_qty ?? item.quantity) : 0);
      })
      .catch(() => setSourceQty(null));
  }, [F.values.product_id, F.values.fromWarehouseId]);

  const fromWH = myWarehouses.find(
    (w) => String(w.warehouse_id) === String(F.values.fromWarehouseId),
  );
  const toWH = myWarehouses.find((w) => String(w.warehouse_id) === String(F.values.toWarehouseId));
  const selProd = products.find((p) => String(p.product_id) === String(F.values.product_id));

  return (
    <Modal open title='Transfer Stock Between Warehouses' onClose={onClose} size='md'>
      <Modal.Body>
        {!confirming ? (
          /* ── Step 1: form ── */
          <form id='transfer-form' onSubmit={F.handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Input
                  label='Search Product'
                  placeholder='Type to filter…'
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                />
              </div>
              <Select
                label='Product'
                required
                value={F.values.product_id}
                onChange={(e) => F.setFieldValue('product_id', e.target.value)}
                error={err('product_id')}
              >
                <option value=''>Select product…</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} — {p.sku}
                  </option>
                ))}
              </Select>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                <Select
                  label='From Warehouse'
                  required
                  value={F.values.fromWarehouseId}
                  onChange={(e) => F.setFieldValue('fromWarehouseId', e.target.value)}
                  error={err('fromWarehouseId')}
                  disabled={!isAdmin && myWarehouses.length === 1}
                >
                  <option value=''>Source…</option>
                  {myWarehouses.map((w) => (
                    <option key={w.warehouse_id} value={w.warehouse_id}>
                      {w.name}
                    </option>
                  ))}
                </Select>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: 6,
                  }}
                >
                  <SwapIcon style={{ color: 'var(--color-text-muted)', fontSize: 20 }} />
                </div>

                <Select
                  label='To Warehouse'
                  required
                  value={F.values.toWarehouseId}
                  onChange={(e) => F.setFieldValue('toWarehouseId', e.target.value)}
                  error={err('toWarehouseId')}
                >
                  <option value=''>Destination…</option>
                  {myWarehouses
                    .filter((w) => String(w.warehouse_id) !== String(F.values.fromWarehouseId))
                    .map((w) => (
                      <option key={w.warehouse_id} value={w.warehouse_id}>
                        {w.name}
                      </option>
                    ))}
                </Select>
              </div>

              {/* Available stock hint */}
              {sourceQty !== null && (
                <div
                  style={{
                    background: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-text-secondary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  Available in source warehouse:{' '}
                  <strong
                    style={{
                      color: sourceQty > 0 ? 'var(--color-success)' : 'var(--color-danger)',
                    }}
                  >
                    {fmt(sourceQty)} units
                  </strong>
                </div>
              )}

              <Input
                label='Quantity to Transfer'
                required
                type='number'
                min='1'
                max={sourceQty || undefined}
                {...F.getFieldProps('quantity')}
                error={err('quantity')}
              />
              <Input
                label='Notes'
                placeholder='Reason for transfer (optional)'
                {...F.getFieldProps('notes')}
              />
            </div>
          </form>
        ) : (
          /* ── Step 2: confirmation ── */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              alignItems: 'center',
              textAlign: 'center',
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--color-primary-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SwapIcon style={{ fontSize: 28, color: 'var(--color-primary)' }} />
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-primary)',
              }}
            >
              Confirm Transfer
            </h3>

            <div
              style={{
                background: 'var(--color-surface-alt)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                width: '100%',
                textAlign: 'left',
              }}
            >
              <dl
                style={{
                  margin: 0,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px 24px',
                }}
              >
                <DLItem label='Product' value={selProd?.name || F.values.product_id} />
                <DLItem
                  label='Quantity'
                  value={<Badge variant='primary'>{fmt(F.values.quantity)} units</Badge>}
                />
                <DLItem label='From' value={fromWH?.name || `WH #${F.values.fromWarehouseId}`} />
                <DLItem label='To' value={toWH?.name || `WH #${F.values.toWarehouseId}`} />
                {F.values.notes && <DLItem label='Notes' value={F.values.notes} />}
              </dl>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              This action will immediately move stock and create an audit log entry.
            </p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {confirming ? (
          <>
            <Button variant='ghost' size='sm' onClick={() => setConfirming(false)}>
              ← Back
            </Button>
            <Button
              variant='primary'
              size='sm'
              loading={F.isSubmitting}
              leftIcon={<CheckIcon style={{ fontSize: 16 }} />}
              onClick={F.submitForm}
            >
              Confirm Transfer
            </Button>
          </>
        ) : (
          <>
            <Button variant='ghost' size='sm' onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant='primary'
              size='sm'
              onClick={() => {
                F.validateForm().then((e) => {
                  if (Object.keys(e).length === 0) setConfirming(true);
                  else F.submitForm();
                });
              }}
            >
              Review Transfer →
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}

function DLItem({ label, value }) {
  return (
    <div>
      <dt
        style={{
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-sans)',
          marginBottom: 2,
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: 'var(--text-base)',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {value}
      </dd>
    </div>
  );
}
