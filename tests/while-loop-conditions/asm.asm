; --------------------------
;     Generated assembly    
; --------------------------

%include	'functions.asm'
%include	'macros.asm'

section .text
global  _start

_start:
	xor		eax, eax
	xor		ebx, ebx
	xor		ecx, ecx
	xor		edx, edx
	mov		ebp, esp	; save program base pointer
	push	ebp

	push	0

while0:
	; condition
	mov		eax, [ebp - 2 * 4]
	push	eax	; (x1)
	mov		ebx, 5
	cmp		eax, ebx
	jg		end_while0
	; body
	; statement_debug (int)
	mov		eax, [ebp + -2 * 4]
	push	eax	; (x1)
	pop		eax
	call	iprintLF
	pop		eax
	inc		eax
	mov		[ebp + -2 * 4], eax


	jmp		while0

end_while0:
	push	10

while1:
	; condition
	mov		eax, [ebp - 3 * 4]
	push	eax	; (x2)
	mov		ebx, 5
	cmp		eax, ebx
	jl		end_while1
	; body
	; statement_debug (int)
	mov		eax, [ebp + -3 * 4]
	push	eax	; (x2)
	pop		eax
	call	iprintLF
	dec		
	mov		[ebp + -3 * 4], eax

	jmp		while1

end_while1:
	push	0

while2:
	; condition
	mov		eax, [ebp - 5 * 4]
	push	eax	; (x3)
	mov		ebx, 5
	cmp		eax, ebx
	jge		end_while2
	; body
	; statement_debug (int)
	mov		eax, [ebp + -5 * 4]
	push	eax	; (x3)
	pop		eax
	call	iprintLF
	pop		eax
	inc		eax
	mov		[ebp + -5 * 4], eax


	jmp		while2

end_while2:
	push	10

while3:
	; condition
	mov		eax, [ebp - 6 * 4]
	push	eax	; (x4)
	mov		ebx, 5
	cmp		eax, ebx
	jle		end_while3
	; body
	; statement_debug (int)
	mov		eax, [ebp + -6 * 4]
	push	eax	; (x4)
	pop		eax
	call	iprintLF
	dec		
	mov		[ebp + -6 * 4], eax

	jmp		while3

end_while3:
	push	0

while4:
	; condition
	mov		eax, [ebp - 8 * 4]
	push	eax	; (x5)
	mov		ebx, 5
	cmp		eax, ebx
	je		end_while4
	; body
	; statement_debug (int)
	mov		eax, [ebp + -8 * 4]
	push	eax	; (x5)
	pop		eax
	call	iprintLF
	pop		eax
	inc		eax
	mov		[ebp + -8 * 4], eax


	jmp		while4

end_while4:
	push	1

while5:
	; condition
	mov		eax, [ebp - 9 * 4]
	push	eax	; (x)
	mov		ebx, 1
	cmp		eax, ebx
	jne		end_while5
	; body
	; statement_debug (int)
	mov		eax, [ebp + -9 * 4]
	push	eax	; (x)
	pop		eax
	call	iprintLF
	pop		eax
	inc		eax
	mov		[ebp + -9 * 4], eax


	jmp		while5

end_while5:
	mov		ebx, 0	; exit code
	call	_exit
