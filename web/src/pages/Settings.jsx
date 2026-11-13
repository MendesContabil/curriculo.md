import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useBranding } from '../theme';
import {
  Badge,
  Button,
  Card,
  Field,
  Spinner,
  formatBRL,
  useToast,
} from '../components/ui.jsx';
import { IconCheck, IconPalette, IconTrash, IconUpload, IconWallet } from '../components/icons.jsx';

const FONT_OPTIONS = [
  { key: 'modern', name: 'Moderna', desc: 'Poppins · limpa e contemporânea' },
  { key: 'classic', name: 'Clássica', desc: 'Playfair + Lora · editorial' },
  { key: 'soft', name: 'Suave', desc: 'Nunito · acolhedora' },
  { key: 'minimal', name: 'Minimalista', desc: 'Inter · neutra e direta' },
];

const COLOR_PRESETS = ['#4f7f6b', '#3f6fa8', '#8a5b7d', '#b5763d', '#5a6acf', '#2f3b38'];

export default function Settings() {
  const toast = useToast();
  const { branding, refresh, applyBranding } = useBranding();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    api
      .get('/api/settings')
      .then((data) => {
        setSettings(data);
        setForm(data);
      })
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  const preview = useMemo(() => {
    if (!form) return null;
    return {
      ...branding,
      clinicName: form.clinicName,
      primaryColor: form.primaryColor,
      backgroundColor: form.backgroundColor,
      fontKey: form.fontKey,
      backgroundType: form.backgroundType,
      logoUrl: settings?.logoUrl || null,
      backgroundUrl: settings?.backgroundUrl || null,
    };
  }, [form, branding, settings]);

  useEffect(() => {
    if (preview) applyBranding(preview);
  }, [preview, applyBranding]);

  const brandingRef = useRef(branding);
  useEffect(() => {
    brandingRef.current = branding;
  }, [branding]);

  useEffect(
    () => () => {
      applyBranding(brandingRef.current);
    },
    [applyBranding]
  );

  if (loading || !form) return <Spinner label="Carregando configurações" />;

  const update = (key) => (event) =>
    setForm((f) => ({ ...f, [key]: event.target.value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await api.put('/api/settings', {
        clinicName: form.clinicName,
        primaryColor: form.primaryColor,
        backgroundColor: form.backgroundColor,
        backgroundType: form.backgroundType,
        fontKey: form.fontKey,
        pixKey: form.pixKey,
        leveSaudeDiscount: Number(form.leveSaudeDiscount) || 0,
      });
      setSettings(saved);
      setForm(saved);
      await refresh();
      toast('Configurações de aparência salvas.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (kind, file) => {
    if (!file) return;
    setUploading(kind);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('kind', kind);
      const saved = await api.upload('/api/settings/assets', data);
      setSettings(saved);
      setForm((f) => ({ ...f, ...saved }));
      await refresh();
      toast(kind === 'logo' ? 'Logotipo atualizado.' : 'Imagem de fundo atualizada.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading('');
    }
  };

  const removeAsset = async (kind) => {
    try {
      const saved = await api.del(`/api/settings/assets/${kind}`);
      setSettings(saved);
      setForm((f) => ({ ...f, ...saved }));
      await refresh();
      toast('Imagem removida.');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="eyebrow">Configurações</p>
          <h1>Aparência do consultório</h1>
          <p className="page-sub">
            Personalize a identidade visual e as regras financeiras do seu espaço.
          </p>
        </div>
        <div className="page-actions">
          <Button type="submit" form="settings-form" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </header>

      <form id="settings-form" className="stack" onSubmit={save}>
        <div className="split settings-split">
          <Card className="panel">
            <div className="panel-head">
              <div>
                <h2>
                  <IconPalette width={18} height={18} /> Identidade visual
                </h2>
                <p>O nome e a logo aparecem para você e para os pacientes.</p>
              </div>
              <Badge tone="teal">White-label</Badge>
            </div>

            <div className="form">
              <Field label="Nome do consultório">
                <input value={form.clinicName} onChange={update('clinicName')} placeholder="Espaço Acolher" />
              </Field>

              <Field label="Logotipo / foto de perfil">
                <div className="asset-row">
                  <div className="asset-preview logo-preview">
                    {settings?.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logotipo atual" />
                    ) : (
                      <span>{form.clinicName?.slice(0, 1) || 'C'}</span>
                    )}
                  </div>
                  <div className="asset-actions">
                    <label className="btn btn-ghost btn-sm">
                      <IconUpload width={16} height={16} />
                      {uploading === 'logo' ? 'Enviando…' : 'Enviar imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => uploadAsset('logo', e.target.files?.[0])}
                      />
                    </label>
                    {settings?.logoUrl && (
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        onClick={() => removeAsset('logo')}
                      >
                        <IconTrash width={15} height={15} /> Remover
                      </button>
                    )}
                  </div>
                </div>
              </Field>

              <Field label="Cor principal dos botões">
                <div className="color-row">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`swatch ${form.primaryColor?.toLowerCase() === color ? 'swatch-active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setForm((f) => ({ ...f, primaryColor: color }))}
                      aria-label={`Usar a cor ${color}`}
                    >
                      {form.primaryColor?.toLowerCase() === color && <IconCheck width={16} height={16} />}
                    </button>
                  ))}
                  <label className="custom-color">
                    <input
                      type="color"
                      value={form.primaryColor || '#4f7f6b'}
                      onChange={update('primaryColor')}
                    />
                    <span>Outra cor</span>
                  </label>
                </div>
              </Field>

              <Field label="Fundo do aplicativo">
                <div className="choice-grid">
                  <label className={`choice ${form.backgroundType === 'color' ? 'choice-active' : ''}`}>
                    <input
                      type="radio"
                      name="bgType"
                      checked={form.backgroundType === 'color'}
                      onChange={() => setForm((f) => ({ ...f, backgroundType: 'color' }))}
                    />
                    <strong>Cor sólida</strong>
                    <span>Ajuste o tom do fundo</span>
                  </label>
                  <label className={`choice ${form.backgroundType === 'image' ? 'choice-active' : ''}`}>
                    <input
                      type="radio"
                      name="bgType"
                      checked={form.backgroundType === 'image'}
                      onChange={() => setForm((f) => ({ ...f, backgroundType: 'image' }))}
                    />
                    <strong>Imagem</strong>
                    <span>Use uma foto ou textura</span>
                  </label>
                </div>
              </Field>

              {form.backgroundType === 'color' ? (
                <Field label="Cor do fundo">
                  <div className="bg-color-field">
                    <input
                      type="color"
                      value={form.backgroundColor || '#f3f5f1'}
                      onChange={update('backgroundColor')}
                    />
                    <input value={form.backgroundColor} onChange={update('backgroundColor')} maxLength={7} />
                  </div>
                </Field>
              ) : (
                <Field label="Imagem de fundo" hint="Prefira imagens suaves para manter a leitura confortável.">
                  <div className="asset-row">
                    <div className="asset-preview bg-preview">
                      {settings?.backgroundUrl ? (
                        <img src={settings.backgroundUrl} alt="Fundo atual" />
                      ) : (
                        <span>Sem imagem</span>
                      )}
                    </div>
                    <div className="asset-actions">
                      <label className="btn btn-ghost btn-sm">
                        <IconUpload width={16} height={16} />
                        {uploading === 'background' ? 'Enviando…' : 'Enviar imagem'}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => uploadAsset('background', e.target.files?.[0])}
                        />
                      </label>
                      {settings?.backgroundUrl && (
                        <button
                          type="button"
                          className="btn btn-danger-ghost btn-sm"
                          onClick={() => removeAsset('background')}
                        >
                          <IconTrash width={15} height={15} /> Remover
                        </button>
                      )}
                    </div>
                  </div>
                </Field>
              )}

              <Field label="Tipografia" hint="A fonte é aplicada em todo o aplicativo.">
                <div className="font-grid">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.key}
                      type="button"
                      className={`font-card font-${font.key} ${form.fontKey === font.key ? 'font-card-active' : ''}`}
                      onClick={() => setForm((f) => ({ ...f, fontKey: font.key }))}
                    >
                      <span className="font-sample">Aa</span>
                      <strong>{font.name}</strong>
                      <span>{font.desc}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Card>

          <div className="stack">
            <Card className="panel">
              <div className="panel-head">
                <div>
                  <h2>
                    <IconWallet width={18} height={18} /> Pagamentos
                  </h2>
                  <p>Chave PIX e desconto do convênio Leve Saúde.</p>
                </div>
              </div>
              <div className="form">
                <Field
                  label="Chave PIX"
                  hint="Exibida na área do paciente com botão de copiar."
                >
                  <textarea
                    rows={2}
                    value={form.pixKey}
                    onChange={update('pixKey')}
                    placeholder="E-mail, CPF, telefone ou chave aleatória"
                  />
                </Field>
                <Field
                  label="Desconto Leve Saúde (%)"
                  hint="Sugerido automaticamente ao registrar pacotes de pacientes do convênio."
                >
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.leveSaudeDiscount}
                    onChange={update('leveSaudeDiscount')}
                  />
                </Field>
              </div>
            </Card>

            <Card className="theme-preview">
              <p className="eyebrow">Prévia</p>
              <h3 style={{ fontFamily: 'var(--display-font)' }}>{form.clinicName || 'Seu consultório'}</h3>
              <p>Pacote de 4 sessões</p>
              <div className="preview-values">
                <strong>{formatBRL(640)}</strong>
                <span>
                  com desconto de {form.leveSaudeDiscount || 0}%:{' '}
                  <strong>
                    {formatBRL(
                      Math.round(640 * (1 - (Number(form.leveSaudeDiscount) || 0) / 100) * 100) / 100
                    )}
                  </strong>
                </span>
              </div>
              <button type="button" className="btn btn-primary">
                Exemplo de botão
              </button>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
