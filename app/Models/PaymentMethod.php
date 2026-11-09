<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    protected $table = 'app_payment_methods';

    protected $fillable = ['name', 'details', 'active', 'needs_ref', 'qr'];

    protected $casts = ['active' => 'boolean', 'needs_ref' => 'boolean'];

    /** Orders paid with this method (a single method; split bills are kept per payment below). */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'payment_method');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class, 'method');
    }

    /** Tables whose guests are asking for the bill with this method right now. */
    public function billRequests(): HasMany
    {
        return $this->hasMany(TableSession::class, 'bill_method');
    }
}
