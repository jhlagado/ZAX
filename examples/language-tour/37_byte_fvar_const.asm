; ZAX lowered .asm trace
; range: $0100..$2061 (end exclusive)

; func byte_fvar_const begin
byte_fvar_const:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
ld E, (IX + $0004)             ; 010B: DD 5E 04
ld D, (IX + $0005)             ; 010E: DD 56 05
ex DE, HL                      ; 0111: EB
ld DE, $0002                   ; 0112: 11 02 00
add HL, DE                     ; 0115: 19
push HL                        ; 0116: E5
pop HL                         ; 0117: E1
ld A, (hl)                     ; 0118: 7E
push AF                        ; 0119: F5
ld E, (IX + $0004)             ; 011A: DD 5E 04
ld D, (IX + $0005)             ; 011D: DD 56 05
ex DE, HL                      ; 0120: EB
ld DE, $0003                   ; 0121: 11 03 00
add HL, DE                     ; 0124: 19
push HL                        ; 0125: E5
pop HL                         ; 0126: E1
ld (hl), A                     ; 0127: 77
pop AF                         ; 0128: F1
ld H, $0000                    ; 0129: 26 00
ld L, A                        ; 012B: 6F
__zax_epilogue_0:
pop DE                         ; 012C: D1
pop BC                         ; 012D: C1
pop AF                         ; 012E: F1
ld SP, IX                      ; 012F: DD F9
pop IX                         ; 0131: DD E1
ret                            ; 0133: C9
; func byte_fvar_const end
; func main begin
main:
push IX                        ; 0134: DD E5
ld IX, $0000                   ; 0136: DD 21 00 00
add IX, SP                     ; 013A: DD 39
push AF                        ; 013C: F5
push BC                        ; 013D: C5
push DE                        ; 013E: D5
push HL                        ; 013F: E5
ld HL, glob_bytes              ; 0140: 21 00 00
push HL                        ; 0143: E5
call byte_fvar_const           ; 0144: CD 00 00
inc SP                         ; 0147: 33
inc SP                         ; 0148: 33
__zax_epilogue_1:
pop HL                         ; 0149: E1
pop DE                         ; 014A: D1
pop BC                         ; 014B: C1
pop AF                         ; 014C: F1
ld SP, IX                      ; 014D: DD F9
pop IX                         ; 014F: DD E1
ret                            ; 0151: C9
; func main end

; symbols:
; label byte_fvar_const = $0100
; label __zax_epilogue_0 = $012C
; label main = $0134
; label __zax_epilogue_1 = $0149
; data glob_bytes = $2000
; label __zax_startup = $2008
