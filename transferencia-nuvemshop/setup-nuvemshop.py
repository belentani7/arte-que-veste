"""
Arte Que Veste — Setup automático en Nuvemshop
Ejecutar: python setup-nuvemshop.py
"""
import asyncio
import os
from browser_use import Agent, Browser
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0.0)

TASK = """
You are setting up an online store called "Arte Que Veste" on Nuvemshop (nuvemshop.com.br).

STEP-BY-STEP INSTRUCTIONS:

1. NAVIGATE to https://www.nuvemshop.com.br and click "Comece grátis" or "Criar loja gratuita"

2. FILL IN the registration form:
   - Email: Use the email provided in sensitive_data
   - Password: Use the password provided in sensitive_data
   - Store name: "Arte Que Veste"
   - Complete the registration

3. After registration, go to the store admin panel (usually at https://www.nuvemshop.com.br/admin)

4. CONFIGURE STORE BRANDING:
   - Go to Settings > Customization or Configurações > Personalização
   - Store name: "Arte Que Veste"
   - Slogan: "Xilogravura no tecido, cordel no corpo"
   - Primary color: #40E0D0 (turquesa)
   - Secondary color: #1a1a1a (preto)

5. ADD PRODUCTS (go to Products > Add product or Produtos > Adicionar produto):
   
   Product 1: Vestido Festa Junina
   - SKU: VFJ-001
   - Price: 299.00
   - Category: feminino
   - Stock: 12
   - Description: Vestido artesanal em viscose exclusiva com estampas de xilogravura nordestina
   
   Product 2: Camiseta Bumba Meu Boi
   - SKU: CBM-001
   - Price: 129.00
   - Category: masculino
   - Stock: 30
   - Description: Camiseta 100% algodão premium com estampa original de Bumba Meu Boi
   
   Product 3: Bolsa Tote Bag
   - SKU: BTB-001
   - Price: 89.00
   - Category: acessorios
   - Stock: 25
   - Description: Bolsa tote em algodão cru com arte de xilogravura
   
   Product 4: Brincos Xilogravura
   - SKU: BXI-001
   - Price: 45.00
   - Category: bijuteria
   - Stock: 40
   - Description: Par de brincos artesanais em madeira com motifs de xilogravura nordestina
   
   Product 5: Sandália Nordestina
   - SKU: SAN-001
   - Price: 159.00
   - Category: calcados
   - Stock: 18
   - Description: Sandália artesanal em couro legítimo com solado de madeira
   
   Product 6: Caneca Artesanal
   - SKU: CAN-001
   - Price: 49.00
   - Category: souvenirs
   - Stock: 50
   - Description: Caneca de cerâmica pintada à mão com temas de cordel e xilogravura
   
   Product 7: Camiseta Infantil Boi Bumbá
   - SKU: CIB-001
   - Price: 79.00
   - Category: infantil
   - Stock: 22
   - Description: Camiseta infantil 100% algodão macio com estampa de Boi Bumbá
   
   Product 8: Vestido Infantil Florido
   - SKU: VIF-001
   - Price: 89.00
   - Category: infantil
   - Stock: 15
   - Description: Vestido infantil em algodão macio com estampa floral nordestina

6. CONFIGURE PAYMENTS:
   - Go to Settings > Payments or Configurações > Pagamentos
   - Enable Nuvem Pago (PIX automatic)
   - Enable credit card payments
   - Configure installment up to 12x

7. CONFIGURE SHIPPING:
   - Go to Settings > Shipping or Configurações > Envios
   - Add Correios as carrier
   - Origin CEP: 49000-000 (Aracaju/SE)
   - Enable PAC and SEDEX services

8. After completing all steps, report what was done and any issues encountered.
"""

async def main():
    if os.getenv("AQV_ALLOW_EXTERNAL_SETUP") != "YES":
        raise RuntimeError(
            "External setup disabled. The owner must review the catalog and explicitly "
            "set AQV_ALLOW_EXTERNAL_SETUP=YES before any account action."
        )
    owner_email = os.getenv("AQV_OWNER_EMAIL")
    owner_password = os.getenv("AQV_OWNER_PASSWORD")
    if not owner_email or not owner_password:
        raise RuntimeError("Missing AQV_OWNER_EMAIL or AQV_OWNER_PASSWORD.")

    browser = Browser(
        headless=False,
        window_size={'width': 1280, 'height': 900},
    )
    
    agent = Agent(
        task=TASK,
        llm=llm,
        browser=browser,
        sensitive_data={
            "email": owner_email,
            "password": owner_password
        },
        max_steps=200,
        generate_gif=True,
    )
    
    history = await agent.run()
    
    print("\n" + "="*60)
    print("RESUMEN DE LA CONFIGURACIÓN")
    print("="*60)
    print(f"Pasos ejecutados: {history.number_of_steps()}")
    print(f"Duración total: {history.total_duration_seconds():.1f} segundos")
    print(f"¿Completado?: {history.is_done()}")
    print(f"¿Exitoso?: {history.is_successful()}")
    
    if history.errors():
        print(f"\nErrores encontrados: {len(history.errors())}")
        for i, err in enumerate(history.errors()):
            if err:
                print(f"  {i+1}. {err[:100]}")
    
    urls = history.urls()
    if urls:
        print(f"\nURLs visitadas: {len(urls)}")
        for url in urls[-5:]:
            print(f"  - {url}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    asyncio.run(main())
