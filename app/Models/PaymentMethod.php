<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $table = 'app_payment_methods';

    protected $fillable = ['name', 'details', 'active', 'needs_ref', 'qr'];

    protected $casts = ['active' => 'boolean', 'needs_ref' => 'boolean'];
}
