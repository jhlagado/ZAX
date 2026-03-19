; ZAX lowered .asm trace
; range: $0100..$8071 (end exclusive)

; func prime_sieve begin
prime_sieve:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push HL                        ; 0108: E5
ld HL, $0002                   ; 0109: 21 02 00
ex (SP), HL                    ; 010C: E3
push HL                        ; 010D: E5
ld HL, $0000                   ; 010E: 21 00 00
ex (SP), HL                    ; 0111: E3
push AF                        ; 0112: F5
push BC                        ; 0113: C5
push DE                        ; 0114: D5
push HL                        ; 0115: E5
ld A, $0001                    ; 0116: 3E 01
or A                           ; 0118: B7
__zax_while_cond_1:
jp z, __zax_while_end_2        ; 0119: CA 00 00
ld A, (ix-$02)                 ; 011C: DD 7E FE
cp StopFactor                  ; 011F: FE 05
jp c, __zax_if_else_3          ; 0121: DA 00 00
jp __zax_while_end_2           ; 0124: C3 00 00
__zax_if_else_3:
ex DE, HL                      ; 0127: EB
ld E, (IX - $0002)             ; 0128: DD 5E FE
ex DE, HL                      ; 012B: EB
push DE                        ; 012C: D5
push HL                        ; 012D: E5
ld de, is_prime                ; 012E: 11 00 00
ld H, $0000                    ; 0131: 26 00
ld L, L                        ; 0133: 6D
add HL, DE                     ; 0134: 19
ld A, (HL)                     ; 0135: 7E
pop HL                         ; 0136: E1
pop DE                         ; 0137: D1
or A                           ; 0138: B7
jp nz, __zax_if_else_5         ; 0139: C2 00 00
push DE                        ; 013C: D5
ld E, (IX - $0002)             ; 013D: DD 5E FE
inc E                          ; 0140: 1C
ld (IX - $0002), E             ; 0141: DD 73 FE
pop DE                         ; 0144: D1
ld A, $0001                    ; 0145: 3E 01
or A                           ; 0147: B7
jp __zax_while_cond_1          ; 0148: C3 00 00
__zax_if_else_5:
ld A, (ix-$02)                 ; 014B: DD 7E FE
ld B, (ix-$02)                 ; 014E: DD 46 FE
add A, B                       ; 0151: 80
ld (ix-$04), A                 ; 0152: DD 77 FC
ld A, $0001                    ; 0155: 3E 01
or A                           ; 0157: B7
__zax_while_cond_7:
jp z, __zax_while_end_8        ; 0158: CA 00 00
ld A, (ix-$04)                 ; 015B: DD 7E FC
cp Limit                       ; 015E: FE 10
jp c, __zax_if_else_9          ; 0160: DA 00 00
jp __zax_while_end_8           ; 0163: C3 00 00
__zax_if_else_9:
ex DE, HL                      ; 0166: EB
ld E, (IX - $0004)             ; 0167: DD 5E FC
ex DE, HL                      ; 016A: EB
ld A, $0000                    ; 016B: 3E 00
push DE                        ; 016D: D5
push HL                        ; 016E: E5
ld de, is_prime                ; 016F: 11 00 00
ld H, $0000                    ; 0172: 26 00
ld L, L                        ; 0174: 6D
add HL, DE                     ; 0175: 19
ld (HL), A                     ; 0176: 77
pop HL                         ; 0177: E1
pop DE                         ; 0178: D1
ld A, (ix-$04)                 ; 0179: DD 7E FC
ld B, (ix-$02)                 ; 017C: DD 46 FE
add A, B                       ; 017F: 80
ld (ix-$04), A                 ; 0180: DD 77 FC
ld A, $0001                    ; 0183: 3E 01
or A                           ; 0185: B7
jp __zax_while_cond_7          ; 0186: C3 00 00
__zax_while_end_8:
push DE                        ; 0189: D5
ld E, (IX - $0002)             ; 018A: DD 5E FE
inc E                          ; 018D: 1C
ld (IX - $0002), E             ; 018E: DD 73 FE
pop DE                         ; 0191: D1
ld A, $0001                    ; 0192: 3E 01
or A                           ; 0194: B7
jp __zax_while_cond_1          ; 0195: C3 00 00
__zax_epilogue_0:
__zax_while_end_2:
pop HL                         ; 0198: E1
pop DE                         ; 0199: D1
pop BC                         ; 019A: C1
pop AF                         ; 019B: F1
ld SP, IX                      ; 019C: DD F9
pop IX                         ; 019E: DD E1
ret                            ; 01A0: C9
; func main begin
; func prime_sieve end
main:
push IX                        ; 01A1: DD E5
ld IX, $0000                   ; 01A3: DD 21 00 00
add IX, SP                     ; 01A7: DD 39
push AF                        ; 01A9: F5
push BC                        ; 01AA: C5
push DE                        ; 01AB: D5
push HL                        ; 01AC: E5
call prime_sieve               ; 01AD: CD 00 00
__zax_epilogue_11:
pop HL                         ; 01B0: E1
pop DE                         ; 01B1: D1
pop BC                         ; 01B2: C1
pop AF                         ; 01B3: F1
ld SP, IX                      ; 01B4: DD F9
pop IX                         ; 01B6: DD E1
ret                            ; 01B8: C9
; func main end

; symbols:
; label prime_sieve = $0100
; label __zax_while_cond_1 = $0119
; label __zax_if_else_3 = $0127
; label __zax_if_else_5 = $014B
; label __zax_while_cond_7 = $0158
; label __zax_if_else_9 = $0166
; label __zax_while_end_8 = $0189
; label __zax_epilogue_0 = $0198
; label __zax_while_end_2 = $0198
; label main = $01A1
; label __zax_epilogue_11 = $01B0
; data is_prime = $8000
; label __zax_startup = $8010
; constant Limit = $0010 (16)
; constant StopFactor = $0005 (5)
