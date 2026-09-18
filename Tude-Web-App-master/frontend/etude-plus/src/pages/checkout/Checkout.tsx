import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Card, Button, Input, Label, FadeIn } from "@/components/ui/Premium";
import { ShieldCheck, CreditCard, AlertCircle, Loader2, Tag, CheckCircle2, ChevronDown, X } from "lucide-react";
import { formatTND } from "@/lib/utils";
import { useGetClass, useCheckout, useConfirmPayment, getToken } from "@workspace/api-client-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export function Checkout() {
  const [, params] = useRoute("/checkout/:id");
  const classId = Number(params?.id);
  const [, setLocation] = useLocation();

  const { data: cls, isLoading: isClassLoading, isError } = useGetClass(classId, { query: { enabled: !!classId } as any });
  const checkoutMutation = useCheckout();
  const confirmPaymentMutation = useConfirmPayment();

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [formError, setFormError] = useState("");

  // Promo code state
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "checking" | "applied" | "error">("idle");
  const [promoError, setPromoError] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmt, setDiscountAmt] = useState(0);

  const originalPrice = cls?.price ?? 0;
  const total = appliedCode ? Math.round((originalPrice - discountAmt) * 100) / 100 : originalPrice;

  const applyPromoCode = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoStatus("checking");
    setPromoError("");
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/discount-codes/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code, classPrice: originalPrice }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCode(data.code);
        setDiscountPct(data.discountPercentage);
        setDiscountAmt(data.discountAmount);
        setPromoStatus("applied");
      } else {
        setPromoStatus("error");
        setPromoError(
          data.reason === "Code expiré" ? "Code expiré" :
          data.reason === "Code épuisé" ? "Ce code a atteint son nombre maximal d'utilisations" :
          "Code promo invalide"
        );
      }
    } catch {
      setPromoStatus("error");
      setPromoError("Erreur lors de la vérification du code");
    }
  };

  const removePromoCode = () => {
    setAppliedCode(null);
    setDiscountPct(0);
    setDiscountAmt(0);
    setPromoInput("");
    setPromoStatus("idle");
    setPromoError("");
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      const checkoutRes = await checkoutMutation.mutateAsync({
        data: { classId, discountCode: appliedCode ?? undefined } as any,
      });
      const transactionId = checkoutRes?.transactionId;
      if (!transactionId) throw new Error("Transaction non créée");
      await confirmPaymentMutation.mutateAsync({
        data: {
          transactionId,
          cardNumber: cardNumber.replace(/\s/g, ""),
          cardHolder,
          expiryDate,
          cvv,
        }
      });
      setLocation("/payment-success");
    } catch (err: any) {
      setFormError(err?.message ?? "Une erreur est survenue. Veuillez réessayer.");
    }
  };

  const isSubmitting = checkoutMutation.isPending || confirmPaymentMutation.isPending;

  if (!classId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Cours invalide.</p>
          <Link href="/student/browse"><Button className="mt-4">Parcourir les cours</Button></Link>
        </div>
      </div>
    );
  }

  if (isClassLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !cls) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Cours introuvable</h2>
          <p className="text-muted-foreground mb-4">Ce cours n'existe pas ou n'est plus disponible.</p>
          <Link href="/student/browse"><Button>Parcourir les cours</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pt-24 pb-12">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <FadeIn>
          <h1 className="text-3xl font-serif font-bold mb-8">Finaliser l'inscription</h1>

          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
              <Card className="p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-border pb-6">
                  <CreditCard className="w-6 h-6 text-primary" />
                  <h2 className="text-xl font-bold">Moyen de paiement</h2>
                </div>

                <form onSubmit={handlePay} className="space-y-5">
                  <div>
                    <Label>Numéro de carte</Label>
                    <Input
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      required
                      value={cardNumber}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                        setCardNumber(raw.replace(/(.{4})/g, "$1 ").trim());
                      }}
                    />
                  </div>
                  <div>
                    <Label>Nom sur la carte</Label>
                    <Input
                      placeholder="Nom complet"
                      required
                      value={cardHolder}
                      onChange={e => setCardHolder(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Date d'expiration</Label>
                      <Input
                        placeholder="MM/AA"
                        maxLength={5}
                        required
                        value={expiryDate}
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9/]/g, "");
                          setExpiryDate(v.length === 2 && !v.includes("/") ? v + "/" : v);
                        }}
                      />
                    </div>
                    <div>
                      <Label>CVC</Label>
                      <Input
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        required
                        value={cvv}
                        onChange={e => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {formError}
                    </div>
                  )}

                  <Button type="submit" size="lg" className="w-full mt-6" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement...</> : `Payer ${formatTND(total)}`}
                  </Button>

                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                    Paiement sécurisé crypté SSL
                  </div>
                </form>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card className="p-6 sticky top-24">
                <h3 className="font-bold text-lg mb-4">Résumé de la commande</h3>

                <div className="bg-secondary p-4 rounded-xl mb-6">
                  <p className="font-semibold">{cls.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Par {cls.professor?.fullName ?? "—"}
                  </p>
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 text-sm mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prix du cours</span>
                    <span className={`font-medium ${appliedCode ? "line-through text-muted-foreground" : ""}`}>
                      {formatTND(originalPrice)}
                    </span>
                  </div>
                  {appliedCode && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Code {appliedCode} (−{discountPct}%)
                      </span>
                      <span className="font-semibold">−{formatTND(discountAmt)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-lg font-bold mb-6">
                  <span>Total à payer</span>
                  <span className={`${appliedCode ? "text-green-600" : "text-primary"}`}>{formatTND(total)}</span>
                </div>

                {/* Promo code section */}
                {promoStatus === "applied" ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-semibold">{appliedCode} appliqué !</span>
                    </div>
                    <button onClick={removePromoCode} className="text-green-600 hover:text-green-800 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => setPromoOpen(o => !o)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                      <Tag className="w-4 h-4" />
                      Vous avez un code promo ?
                      <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${promoOpen ? "rotate-180" : ""}`} />
                    </button>

                    {promoOpen && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="ex: ETUDE20"
                            value={promoInput}
                            onChange={e => {
                              setPromoInput(e.target.value.toUpperCase());
                              if (promoStatus === "error") { setPromoStatus("idle"); setPromoError(""); }
                            }}
                            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyPromoCode())}
                            className="flex-1 uppercase text-sm"
                            disabled={promoStatus === "checking"}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={applyPromoCode}
                            disabled={promoStatus === "checking" || !promoInput.trim()}
                            className="shrink-0"
                          >
                            {promoStatus === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                          </Button>
                        </div>
                        {promoStatus === "error" && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {promoError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
