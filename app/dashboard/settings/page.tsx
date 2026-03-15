'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Edit, Check, X, Store, Package, Globe, Loader2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface Company {
  id: number
  name: string
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  is_active: boolean
}

interface Product {
  id: number
  company_id: number
  name: string
  description: string | null
  price: string | null
  category: string | null
}

export default function SettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapedProducts, setScrapedProducts] = useState<any[]>([])
  const [showScrapedProducts, setShowScrapedProducts] = useState(false)

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    website: '',
  })

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
  })

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompany) {
      fetchProducts(selectedCompany.id)
    }
  }, [selectedCompany])

  const fetchCompanies = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      setCompanies(data)
      if (data.length > 0 && !selectedCompany) {
        setSelectedCompany(data.find((c: Company) => c.is_active) || data[0])
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
    setIsLoading(false)
  }

  const fetchProducts = async (companyId: number) => {
    try {
      const res = await fetch(`/api/products?company_id=${companyId}`)
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleSaveCompany = async () => {
    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies'
      const method = editingCompany ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      })

      if (res.ok) {
        setIsCompanyDialogOpen(false)
        setEditingCompany(null)
        setCompanyForm({ name: '', description: '', phone: '', email: '', address: '', website: '' })
        fetchCompanies()
      }
    } catch (error) {
      console.error('Error saving company:', error)
    }
  }

  const handleDeleteCompany = async (id: number) => {
    if (!confirm('Are you sure you want to delete this company? All products will also be deleted.')) return
    
    try {
      await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      if (selectedCompany?.id === id) {
        setSelectedCompany(null)
      }
      fetchCompanies()
    } catch (error) {
      console.error('Error deleting company:', error)
    }
  }

  const handleSetActive = async (company: Company) => {
    try {
      await fetch('/api/companies/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: company.id }),
      })
      fetchCompanies()
    } catch (error) {
      console.error('Error setting active company:', error)
    }
  }

  const handleSaveProduct = async () => {
    if (!selectedCompany) return

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          ...productForm,
          price: productForm.price || null,
        }),
      })

      if (res.ok) {
        setIsProductDialogOpen(false)
        setEditingProduct(null)
        setProductForm({ name: '', description: '', price: '', category: '' })
        fetchProducts(selectedCompany.id)
      }
    } catch (error) {
      console.error('Error saving product:', error)
    }
  }

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (selectedCompany) {
        fetchProducts(selectedCompany.id)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const openCompanyDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setCompanyForm({
        name: company.name,
        description: company.description || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        website: company.website || '',
      })
    } else {
      setEditingCompany(null)
      setCompanyForm({ name: '', description: '', phone: '', email: '', address: '', website: '' })
    }
    setIsCompanyDialogOpen(true)
  }

  const openProductDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setProductForm({
        name: product.name,
        description: product.description || '',
        price: product.price || '',
        category: product.category || '',
      })
    } else {
      setEditingProduct(null)
      setProductForm({ name: '', description: '', price: '', category: '' })
    }
    setIsProductDialogOpen(true)
  }

  const handleScrapeWebsite = async () => {
    if (!selectedCompany?.website) return
    
    setIsScraping(true)
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedCompany.website }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setScrapedProducts(data.products || [])
        setShowScrapedProducts(true)
      }
    } catch (error) {
      console.error('Error scraping website:', error)
    }
    setIsScraping(false)
  }

  const handleImportProducts = async () => {
    if (!selectedCompany || scrapedProducts.length === 0) return
    
    try {
      for (const product of scrapedProducts) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: selectedCompany.id,
            name: product.name,
            description: product.description,
            price: product.price?.replace(/[^0-9.]/g, ''),
          }),
        })
      }
      
      setShowScrapedProducts(false)
      setScrapedProducts([])
      fetchProducts(selectedCompany.id)
    } catch (error) {
      console.error('Error importing products:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Company Settings</h1>
        <p className="text-muted-foreground">Manage your company profiles and products</p>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="products">Products & Services</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Companies</CardTitle>
                <CardDescription>Manage multiple company profiles</CardDescription>
              </div>
              <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openCompanyDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Company
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCompany ? 'Edit Company' : 'Add New Company'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Company Name *</Label>
                      <Input
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={companyForm.description}
                        onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                        placeholder="Describe your company"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={companyForm.phone}
                          onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                          placeholder="+260 xxx xxx xxx"
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={companyForm.email}
                          onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                          placeholder="email@company.com"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Textarea
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        placeholder="Company address"
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                        placeholder="https://company.com"
                      />
                    </div>
                    <Button onClick={handleSaveCompany} className="w-full">
                      {editingCompany ? 'Update Company' : 'Create Company'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {companies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No companies yet. Add your first company to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        company.is_active ? 'border-green-500 bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Store className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{company.name}</h3>
                            {company.is_active && (
                              <Badge className="bg-green-100 text-green-700">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{company.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!company.is_active && (
                          <Button variant="outline" size="sm" onClick={() => handleSetActive(company)}>
                            <Check className="mr-1 h-4 w-4" /> Set Active
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openCompanyDialog(company)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteCompany(company.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Products & Services</CardTitle>
                <CardDescription>
                  {selectedCompany ? `Products for ${selectedCompany.name}` : 'Select a company first'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedCompany?.website && (
                  <Button 
                    variant="outline" 
                    onClick={handleScrapeWebsite} 
                    disabled={isScraping || !selectedCompany.website}
                  >
                    {isScraping ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="mr-2 h-4 w-4" />
                    )}
                    Scrape Website
                  </Button>
                )}
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openProductDialog()} disabled={!selectedCompany}>
                    <Plus className="mr-2 h-4 w-4" /> Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Product/Service Name *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="Describe the product/service"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Price</Label>
                        <Input
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          placeholder="e.g., Software, Service"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveProduct} className="w-full">
                      {editingProduct ? 'Update Product' : 'Add Product'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!selectedCompany ? (
                <p className="text-center text-muted-foreground py-8">
                  Please select or create a company first to add products.
                </p>
              ) : products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No products yet. Add your first product or service.
                </p>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.description}</p>
                          <div className="flex gap-2 mt-1">
                            {product.category && (
                              <Badge variant="secondary">{product.category}</Badge>
                            )}
                            {product.price && (
                              <Badge variant="outline">ZMW {product.price}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openProductDialog(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog for scraped products */}
          <Dialog open={showScrapedProducts} onOpenChange={setShowScrapedProducts}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Products from Website</DialogTitle>
                <DialogDescription>
                  We found these products on your website. Select which ones to import.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {scrapedProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                      {product.price && (
                        <p className="text-sm font-medium">{product.price}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowScrapedProducts(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImportProducts}>
                  Import {scrapedProducts.length} Products
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
