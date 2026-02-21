; ZAX lowered .asm trace
; range: $0100..$015F (end exclusive)

; func poke_record begin
poke_record:
push IX                        ; 0100: DD E5
ld IX, $0000                   ; 0102: DD 21 00 00
add IX, SP                     ; 0106: DD 39
push AF                        ; 0108: F5
push BC                        ; 0109: C5
push DE                        ; 010A: D5
push DE                        ; 010B: D5
push IX                        ; 010C: DD E5
pop HL                         ; 010E: E1
ld DE, $0004                   ; 010F: 11 04 00
add HL, DE                     ; 0112: 19
push HL                        ; 0113: E5
pop DE                         ; 0114: D1
ld a, (hl)                     ; 0115: 7E
ld HL, rec_a                   ; 0116: 21 00 00
ld (hl), a                     ; 0119: 77
push DE                        ; 011A: D5
push IX                        ; 011B: DD E5
pop HL                         ; 011D: E1
ld DE, $0006                   ; 011E: 11 06 00
add HL, DE                     ; 0121: 19
push HL                        ; 0122: E5
pop DE                         ; 0123: D1
ld a, (hl) ; inc hl ; ld h, (hl) ; ld l, a ; 0124: 7E 23 66 6F
push HL                        ; 0128: E5
ld HL, rec_a + 1               ; 0129: 21 00 00
pop DE                         ; 012C: D1
ld (hl), e ; inc hl ; ld (hl), d ; 012D: 73 23 72
ld HL, (rec_a + 1)             ; 0130: 2A 00 00
__zax_epilogue_0:
pop DE                         ; 0133: D1
pop BC                         ; 0134: C1
pop AF                         ; 0135: F1
ld SP, IX                      ; 0136: DD F9
pop IX                         ; 0138: DD E1
ret                            ; 013A: C9
; func main begin
; func poke_record end
main:
push IX                        ; 013B: DD E5
ld IX, $0000                   ; 013D: DD 21 00 00
add IX, SP                     ; 0141: DD 39
push AF                        ; 0143: F5
push BC                        ; 0144: C5
push DE                        ; 0145: D5
push HL                        ; 0146: E5
ld HL, $1234                   ; 0147: 21 34 12
push HL                        ; 014A: E5
ld HL, $0001                   ; 014B: 21 01 00
push HL                        ; 014E: E5
call poke_record               ; 014F: CD 00 00
inc SP                         ; 0152: 33
inc SP                         ; 0153: 33
inc SP                         ; 0154: 33
inc SP                         ; 0155: 33
__zax_epilogue_1:
pop HL                         ; 0156: E1
pop DE                         ; 0157: D1
pop BC                         ; 0158: C1
pop AF                         ; 0159: F1
ld SP, IX                      ; 015A: DD F9
pop IX                         ; 015C: DD E1
ret                            ; 015E: C9
; func main end

; symbols:
; label poke_record = $0100
; label __zax_epilogue_0 = $0133
; label main = $013B
; label __zax_epilogue_1 = $0156
; var rec_a = $0160
